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
    const CANVAS_API_URL = Deno.env.get('CANVAS_API_URL');
    const CANVAS_API_TOKEN = Deno.env.get('CANVAS_API_TOKEN');

    if (!CANVAS_API_URL || !CANVAS_API_TOKEN) {
      console.error('Missing Canvas credentials');
      return new Response(
        JSON.stringify({ error: 'Canvas credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching courses and scanning for midterm dates...');
    
    // Fetch active courses
    const coursesResponse = await fetch(`${CANVAS_API_URL}/api/v1/courses?enrollment_state=active&include[]=syllabus_body&include[]=term`, {
      headers: {
        'Authorization': `Bearer ${CANVAS_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!coursesResponse.ok) {
      console.error('Canvas API error:', coursesResponse.status);
      return new Response(
        JSON.stringify({ error: `Canvas API error: ${coursesResponse.status}` }),
        { status: coursesResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const courses = await coursesResponse.json();
    console.log(`Found ${courses.length} courses`);

    const midterms: any[] = [];

    // Scan each course
    for (const course of courses) {
      console.log(`Scanning course: ${course.name}`);
      
      // Extract dates from syllabus
      if (course.syllabus_body) {
        const syllabusText = course.syllabus_body.replace(/<[^>]*>/g, ' ').toLowerCase();
        const foundDates = extractMidtermDates(syllabusText, course);
        midterms.push(...foundDates);
      }

      // Fetch and scan files with "schedule" or "syllabus" in name
      try {
        const filesResponse = await fetch(
          `${CANVAS_API_URL}/api/v1/courses/${course.id}/files?search_term=schedule&per_page=50`,
          {
            headers: {
              'Authorization': `Bearer ${CANVAS_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (filesResponse.ok) {
          const files = await filesResponse.json();
          
          for (const file of files) {
            const fileName = file.filename?.toLowerCase() || '';
            if (fileName.includes('schedule') || fileName.includes('syllabus')) {
              midterms.push({
                id: `file-${file.id}`,
                title: `See ${file.filename}`,
                course: course.name,
                courseCode: course.course_code,
                dueDate: new Date().toISOString(), // Placeholder
                type: 'exam',
                priority: 'high',
                estimatedTime: 'See document',
                fileUrl: file.url,
                description: `Check ${file.filename} for exam schedule details`,
                submitted: false,
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching files for ${course.name}:`, error);
      }
    }

    console.log(`Found ${midterms.length} midterm/exam entries`);

    return new Response(
      JSON.stringify({ 
        midterms,
        scannedCourses: courses.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error scanning midterm dates:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractMidtermDates(text: string, course: any): any[] {
  const results: any[] = [];
  
  // Keywords to look for
  const examKeywords = ['midterm', 'mid-term', 'exam', 'test', 'final'];
  
  // Date patterns (various formats)
  const datePatterns = [
    /(\w+\s+\d{1,2},?\s+\d{4})/gi, // January 15, 2024 or January 15 2024
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/gi, // 1/15/2024
    /(\d{1,2}-\d{1,2}-\d{2,4})/gi, // 1-15-2024
  ];

  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line mentions exam keywords
    const hasExamKeyword = examKeywords.some(keyword => line.includes(keyword));
    
    if (hasExamKeyword) {
      // Look for dates in this line and nearby lines
      const contextLines = [
        lines[i - 1] || '',
        line,
        lines[i + 1] || '',
      ].join(' ');

      for (const pattern of datePatterns) {
        const matches = contextLines.match(pattern);
        if (matches) {
          for (const dateStr of matches) {
            try {
              const date = new Date(dateStr);
              if (!isNaN(date.getTime()) && date.getFullYear() >= 2024 && date.getFullYear() <= 2026) {
                // Extract exam type
                let examType = 'Exam';
                if (line.includes('midterm')) examType = 'Midterm';
                else if (line.includes('final')) examType = 'Final Exam';
                
                results.push({
                  id: `syllabus-${course.id}-${date.getTime()}`,
                  title: `${examType} - ${course.course_code}`,
                  course: course.name,
                  courseCode: course.course_code,
                  dueDate: date.toISOString(),
                  type: 'exam',
                  priority: 'high',
                  estimatedTime: '2-3 hours',
                  description: line.trim().substring(0, 200),
                  submitted: false,
                });
              }
            } catch (e) {
              // Invalid date, skip
            }
          }
        }
      }
    }
  }
  
  return results;
}
