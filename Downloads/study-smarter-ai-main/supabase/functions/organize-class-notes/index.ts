import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rawNotes, courseId, courseName, availableModules } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const authHeader = req.headers.get('Authorization');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader! } }
    });

    // Get user from auth header
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Create module list for AI context
    const modulesList = availableModules?.map((m: any) => `- ${m.name}`).join('\n') || 'No modules available';

    const systemPrompt = `You are an expert at analyzing and organizing class notes. Your task is to:
1. Read the student's raw class notes
2. Identify which module/chapter the notes belong to based on the content and available modules
3. Organize and clean up the notes for better readability
4. Return a JSON response with the categorization

Available modules for this course:
${modulesList}

Return ONLY a JSON object in this exact format:
{
  "module_name": "The identified module name from the list above, or 'General' if unclear",
  "chapter_name": "A descriptive chapter/topic name based on the content",
  "organized_content": "The cleaned up and organized version of the notes with proper formatting, bullet points, and structure"
}`;

    const userPrompt = `Analyze and organize these class notes from ${courseName}:

${rawNotes}

Identify which module this belongs to and organize the content clearly.`;

    console.log('Organizing class notes with Lovable AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = JSON.parse(data.choices[0].message.content);

    console.log('AI Analysis:', aiResponse);

    // Save to database
    const { data: savedNote, error: saveError } = await supabase
      .from('user_notes')
      .insert({
        user_id: user.id,
        course_id: courseId,
        course_name: courseName,
        module_name: aiResponse.module_name,
        chapter_name: aiResponse.chapter_name,
        raw_content: rawNotes,
        organized_content: aiResponse.organized_content
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving note:', saveError);
      throw saveError;
    }

    console.log('Class notes organized and saved successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        note: savedNote,
        ...aiResponse 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error organizing notes:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
