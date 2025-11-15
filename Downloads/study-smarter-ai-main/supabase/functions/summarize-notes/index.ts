import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notesText, courseName, chapterName } = await req.json();
    
    if (!notesText || notesText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'No notes text provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Summarizing notes, text length:', notesText.length);

    const systemPrompt = `You are an expert at creating concise, easy-to-understand summaries of academic notes.

Your task is to:
1. Extract the KEY concepts and main ideas
2. Remove unnecessary details and fluff
3. Keep only the most important information
4. Use clear, simple language
5. Organize with bullet points or short paragraphs
6. Make it easy to review and remember

The summary should be:
- Simple and sweet (concise but complete)
- Easy to understand
- Well-organized
- Focused on key concepts
- Perfect for quick review before exams`;

    const userPrompt = `Summarize these ${courseName ? courseName + ' ' : ''}notes${chapterName ? ` from "${chapterName}"` : ''}:

${notesText}

Create a simple, sweet summary that captures all the key concepts in an easy-to-review format.`;

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
        temperature: 0.3, // Lower temperature for more consistent summaries
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
          JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || '';

    if (!summary || summary.trim().length === 0) {
      throw new Error('No summary generated');
    }

    console.log('Summary generated successfully, length:', summary.length);

    return new Response(
      JSON.stringify({ 
        success: true,
        summary 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error summarizing notes:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
