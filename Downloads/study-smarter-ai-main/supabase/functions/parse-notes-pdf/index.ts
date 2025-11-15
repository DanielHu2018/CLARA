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
    const { pdfBase64 } = await req.json();

    if (!pdfBase64) {
      throw new Error('No PDF data provided');
    }

    console.log('Parsing document, base64 length:', pdfBase64.length);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Decode base64 to get file size for logging
    const binaryString = atob(pdfBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    console.log('Document size:', bytes.length, 'bytes');

    // Use AI to extract text from the document
    // Gemini models support document understanding
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: `You are an expert document reader with exceptional attention to detail. Your task is to carefully READ and UNDERSTAND the entire document, just like a human would.

When reading this document:
- Read every section, table, schedule, and calendar
- Pay special attention to dates, exam schedules, assessment calendars
- Look for midterms, finals, tests, quizzes in ANY format
- Extract ALL text including headers, footers, tables, and sidebars
- Preserve the structure so dates and exam names stay connected
- If you see a table or schedule, read it row by row
- If you see dates near exam-related words, make sure to capture both together

Your goal is to extract EVERY piece of text that could contain exam information.` 
          },
          { 
            role: 'user', 
            content: [
              {
                type: 'text',
                text: `Carefully read through this entire document. I need you to extract ALL text content, paying special attention to:

1. Exam schedules and calendars
2. Dates in any format (MM/DD/YYYY, Month Day Year, etc.)
3. Midterm exam mentions (Midterm, MT, Mid-term, Exam 1, etc.)
4. Final exam mentions (Final, Final Exam, etc.)
5. Test and quiz dates
6. Course codes and course names
7. Any assessment dates

Read the document thoroughly, section by section. Extract every word, especially those related to exams and dates. Preserve the structure so that exam names stay connected to their dates.

Return the complete text content with all formatting preserved.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
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
      throw new Error('Failed to parse document');
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || '';

    // Validate that we actually got text
    if (!extractedText || extractedText.trim().length === 0) {
      console.error('No text extracted from document');
      return new Response(
        JSON.stringify({ 
          error: 'No text could be extracted from the document. The PDF may be empty, corrupted, contain only images, or be in an unsupported format.',
          success: false,
          text: ''
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Document parsed successfully, extracted', extractedText.length, 'characters');
    console.log('First 500 chars of extracted text:', extractedText.substring(0, 500));

    return new Response(
      JSON.stringify({ 
        success: true,
        text: extractedText 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error parsing document:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
        text: ''
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
