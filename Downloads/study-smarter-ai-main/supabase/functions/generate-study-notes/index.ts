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
    const { topic, course, assignments, audioTranscription } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build context from assignments
    const assignmentContext = assignments?.map((a: any) => 
      `- ${a.title} (${a.course}): Due ${new Date(a.dueDate).toLocaleDateString()}`
    ).join('\n') || 'No specific assignments provided';

    const systemPrompt = `You are an expert study notes generator that creates comprehensive, well-structured notes optimized for learning and retention. Your notes should:
- Use clear headings and bullet points
- Include key concepts, definitions, and explanations
- Highlight important formulas, theorems, or principles
- Provide examples when helpful
- Use active recall prompts (questions to test understanding)
- Be organized in a logical flow
- Be concise but thorough`;

    const audioContext = audioTranscription 
      ? `\n\nAdditional context from lecture recording:\n${audioTranscription}`
      : '';

    const userPrompt = course 
      ? `Generate comprehensive study notes for ${topic} in the context of ${course}. Include key concepts, important points, and active recall questions.

Related assignments:
${assignmentContext}${audioContext}

Make the notes practical and focused on what the student needs to know for success.`
      : `Generate comprehensive study notes on ${topic}. Include key concepts, important points, and active recall questions.${audioContext}`;

    console.log('Generating study notes with Lovable AI...');

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
        temperature: 0.7,
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
    const notes = data.choices[0].message.content;

    console.log('Study notes generated successfully');

    return new Response(
      JSON.stringify({ notes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating notes:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
