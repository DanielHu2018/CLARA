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

    console.log('Fetching courses from Canvas...');
    
    // Fetch user's courses
    const coursesResponse = await fetch(`${CANVAS_API_URL}/api/v1/courses?enrollment_state=active`, {
      headers: {
        'Authorization': `Bearer ${CANVAS_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!coursesResponse.ok) {
      const errorText = await coursesResponse.text();
      console.error('Canvas API error (courses):', coursesResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Canvas API error: ${coursesResponse.status}` }),
        { status: coursesResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const courses = await coursesResponse.json();
    console.log(`Found ${courses.length} courses`);

    // Fetch files for all courses
    const allFiles = [];
    
    for (const course of courses) {
      console.log(`Fetching files for course: ${course.name}`);
      
      const filesResponse = await fetch(
        `${CANVAS_API_URL}/api/v1/courses/${course.id}/files?per_page=100`,
        {
          headers: {
            'Authorization': `Bearer ${CANVAS_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (filesResponse.ok) {
        const files = await filesResponse.json();
        
        // Filter for relevant file types and enrich with course info
        const enrichedFiles = files
          .filter((f: any) => {
            const ext = f.filename?.toLowerCase().split('.').pop();
            return ['pdf', 'docx', 'doc', 'txt', 'pptx', 'ppt'].includes(ext || '');
          })
          .map((file: any) => ({
            id: file.id,
            name: file.filename,
            url: file.url,
            size: file.size,
            contentType: file['content-type'],
            course: course.name,
            courseId: course.id,
            courseCode: course.course_code,
            createdAt: file.created_at,
            modifiedAt: file.modified_at,
          }));
        
        allFiles.push(...enrichedFiles);
      }
    }

    console.log(`Total files fetched: ${allFiles.length}`);

    return new Response(
      JSON.stringify({ 
        files: allFiles,
        totalFiles: allFiles.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error fetching Canvas files:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
