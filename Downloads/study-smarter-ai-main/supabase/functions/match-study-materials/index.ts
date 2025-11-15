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
    const { examTopics, courseNotes } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      console.error('Missing Lovable API key');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Matching study materials for exam topics: ${examTopics}`);
    console.log(`Analyzing ${courseNotes.length} course notes`);

    // Prepare notes summary for AI
    const notesSummary = courseNotes.map((note: any, idx: number) => ({
      index: idx,
      title: note.module_name || note.chapter_name || 'Note',
      preview: (note.organized_content || note.raw_content || '').substring(0, 500)
    }));

    const systemPrompt = `You are an expert study advisor. Your task is to match course materials with exam topics and provide relevance scores and study recommendations.

Analyze the exam topics and the available course notes, then return a structured analysis of which materials are most relevant for studying.`;

    const userPrompt = `Exam Topics: ${examTopics}

Available Course Notes:
${notesSummary.map((n: any) => `[${n.index}] ${n.title}\nContent preview: ${n.preview}`).join('\n\n')}

Match each note with the exam topics and provide:
1. A relevance score (0-100) for how useful this note is for the exam
2. Specific topics in the note that match the exam
3. Study recommendations for using this material`;

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
        tools: [{
          type: 'function',
          function: {
            name: 'match_study_materials',
            description: 'Return matched study materials with relevance scores',
            parameters: {
              type: 'object',
              properties: {
                matches: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      noteIndex: { type: 'number' },
                      relevanceScore: { type: 'number' },
                      matchedTopics: { 
                        type: 'array',
                        items: { type: 'string' }
                      },
                      studyRecommendation: { type: 'string' }
                    },
                    required: ['noteIndex', 'relevanceScore', 'matchedTopics', 'studyRecommendation']
                  }
                },
                overallStrategy: { type: 'string' }
              },
              required: ['matches', 'overallStrategy']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'match_study_materials' } }
      }),
    });

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to analyze study materials' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    console.log('AI response:', JSON.stringify(aiResponse));

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: 'No analysis generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    console.log('Study materials matched successfully');

    return new Response(
      JSON.stringify(analysis),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error matching study materials:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
