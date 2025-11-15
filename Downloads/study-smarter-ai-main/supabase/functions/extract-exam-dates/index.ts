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
    const { syllabusText } = await req.json();
    
    if (!syllabusText || syllabusText.trim().length === 0) {
      console.log('Empty syllabus text received');
      return new Response(
        JSON.stringify({ examPeriods: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Extracting exam dates from syllabus, text length:', syllabusText.length);
    console.log('First 200 chars:', syllabusText.substring(0, 200));

    const systemPrompt = `You are an expert at analyzing course syllabi and extracting exam and assessment information. 
Extract ALL exams, tests, quizzes, midterms, finals, and major assessments with their dates and details.
Be extremely thorough - look for dates in ANY format (MM/DD/YYYY, Month Day Year, Day Month Year, etc.).
Look for exam mentions even if they're abbreviated (MT, Final, Exam 1, Test 2, etc.).
Extract dates even if they're in tables, schedules, or different sections of the document.`;

    const userPrompt = `Analyze this syllabus and extract EVERY exam, test, midterm, final, quiz, or major assessment mentioned.

Syllabus:
${syllabusText}

For each exam/assessment, identify:
1. The name/type (e.g., "Midterm Exam", "Final Exam", "Quiz 1", "Test 2", "MT1", "Final")
2. The exact date - parse dates in ANY format (November 15, 2024, 11/15/24, 11-15-2024, 15 Nov 2024, etc.) into ISO format (YYYY-MM-DD)
3. The course name if mentioned
4. Course code if mentioned  
5. Topics or chapters covered
6. Duration or time estimate if mentioned

IMPORTANT:
- Look for dates in tables, schedules, calendars, and any section of the document
- Extract dates even if the format is unusual
- If you see "Midterm" or "MT" with a date nearby, extract it
- If you see "Final" or "Final Exam" with a date, extract it
- Look for exam schedules, assessment calendars, or date lists
- Be very thorough - don't miss any assessments!

Look carefully through the ENTIRE text for exam information. Don't miss any assessments!`;

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
              name: "extract_exam_periods",
              description: "Extract all exam and assessment information from syllabus",
              parameters: {
                type: "object",
                properties: {
                  examPeriods: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { 
                          type: "string",
                          description: "Name of the exam (e.g., 'Midterm Exam 1', 'Final Exam')"
                        },
                        date: { 
                          type: "string",
                          description: "ISO date string (YYYY-MM-DD or full ISO datetime)"
                        },
                        course: { 
                          type: "string",
                          description: "Course name if mentioned in syllabus"
                        },
                        courseCode: { 
                          type: "string",
                          description: "Course code if mentioned (e.g., 'CSE 2231')"
                        },
                        topics: {
                          type: "array",
                          items: { type: "string" },
                          description: "Topics or chapters covered in this exam"
                        },
                        duration: {
                          type: "string",
                          description: "How long the exam takes (e.g., '2 hours', '90 minutes')"
                        }
                      },
                      required: ["name", "date"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["examPeriods"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_exam_periods" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('Rate limit exceeded');
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        console.error('AI credits depleted');
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
    console.log('AI response received, has tool calls:', !!data.choices?.[0]?.message?.tool_calls);
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.log('No tool call found in AI response, no exam dates extracted');
      return new Response(
        JSON.stringify({ examPeriods: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const examPeriods = JSON.parse(toolCall.function.arguments).examPeriods;
    console.log(`Successfully extracted ${examPeriods.length} exam(s):`, 
      examPeriods.map((e: any) => `${e.name} on ${e.date}`).join(', '));

    return new Response(
      JSON.stringify({ examPeriods }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error extracting exam dates:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        examPeriods: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
