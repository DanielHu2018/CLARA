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
    const { courses } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Create a summary of courses for context
    const courseSummary = courses.map((c: any) => 
      `- ${c.name} (${c.course_code})`
    ).join('\n');

    const systemPrompt = `You are a learning science expert that creates comprehensive multiple-choice quiz questions based on recent lecture content.`;

    const userPrompt = `Create a comprehensive quiz with 5-8 multiple choice questions based on recent lecture notes from these courses:
${courseSummary}

Generate questions that would help students review material from the past week. Make them practical and course-specific, covering fundamental concepts typically introduced early in each subject. Each question should have 4 options with one correct answer and an explanation for the correct answer.`;

    console.log('Generating weekly quiz with Lovable AI...');

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
        tools: [
          {
            type: "function",
            function: {
              name: "generate_quiz",
              description: "Generate a structured quiz with multiple choice questions",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string", description: "The question text" },
                        options: { 
                          type: "array", 
                          items: { type: "string" },
                          description: "Four answer options"
                        },
                        correctAnswer: { type: "number", description: "Index of correct answer (0-3)" },
                        explanation: { type: "string", description: "Explanation of why the answer is correct" },
                        course: { type: "string", description: "Course this question relates to" }
                      },
                      required: ["question", "options", "correctAnswer", "explanation", "course"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["questions"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_quiz" } }
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
    const toolCall = data.choices[0].message.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== "generate_quiz") {
      throw new Error('Failed to generate quiz in expected format');
    }

    const quizData = JSON.parse(toolCall.function.arguments);

    console.log('Quiz generated successfully');

    return new Response(
      JSON.stringify({ quiz: quizData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating quiz:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
