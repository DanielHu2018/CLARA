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
    const { assignmentId, assignmentTitle, courseName, assignmentDescription } = await req.json();
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

    // Get user's notes for this course
    const { data: userNotes } = await supabase
      .from('user_notes')
      .select('module_name, chapter_name, organized_content')
      .eq('course_name', courseName)
      .limit(10);

    const notesContext = userNotes?.map(note => 
      `Module: ${note.module_name || 'General'} - ${note.chapter_name || 'Topic'}\n${note.organized_content?.substring(0, 200)}...`
    ).join('\n\n') || 'No class notes available yet';

    const systemPrompt = `You are an expert educational assistant that analyzes homework assignments and connects them to relevant course material.

Your task is to:
1. Identify the main topics/concepts covered in the assignment
2. Connect them to related class notes if available
3. Suggest helpful examples or resources
4. Return a structured JSON response

Return ONLY a JSON object in this exact format:
{
  "topics": ["topic1", "topic2", "topic3"],
  "related_notes": "Brief summary of how class notes relate to this homework",
  "helpful_examples": "Specific examples, formulas, or techniques that would help with this assignment"
}`;

    const userPrompt = `Analyze this homework assignment from ${courseName}:

Assignment: ${assignmentTitle}
${assignmentDescription ? `Description: ${assignmentDescription}` : ''}

Available class notes context:
${notesContext}

Identify the key topics, relate them to the class notes, and suggest helpful examples.`;

    console.log('Analyzing homework with Lovable AI...');

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
    const analysis = JSON.parse(data.choices[0].message.content);

    console.log('Homework analysis:', analysis);

    // Save to database
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('homework_analysis')
      .upsert({
        user_id: user.id,
        assignment_id: assignmentId,
        assignment_title: assignmentTitle,
        course_name: courseName,
        topics: analysis.topics || [],
        related_notes: analysis.related_notes || '',
        helpful_examples: analysis.helpful_examples || ''
      }, {
        onConflict: 'user_id,assignment_id'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving analysis:', saveError);
      throw saveError;
    }

    console.log('Homework analyzed and saved successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis: savedAnalysis
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing homework:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
