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
    const { courseId } = await req.json();
    const CANVAS_API_URL = Deno.env.get('CANVAS_API_URL');
    const CANVAS_API_TOKEN = Deno.env.get('CANVAS_API_TOKEN');

    if (!CANVAS_API_URL || !CANVAS_API_TOKEN) {
      console.error('Missing Canvas credentials');
      return new Response(
        JSON.stringify({ error: 'Canvas credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching details for course ${courseId}...`);
    
    // Fetch course details
    const courseResponse = await fetch(
      `${CANVAS_API_URL}/api/v1/courses/${courseId}?include[]=syllabus_body&include[]=term`,
      {
        headers: {
          'Authorization': `Bearer ${CANVAS_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!courseResponse.ok) {
      const errorText = await courseResponse.text();
      console.error('Canvas API error (course):', courseResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Canvas API error: ${courseResponse.status}` }),
        { status: courseResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const course = await courseResponse.json();
    
    // Extract exam dates from syllabus if available
    let examPeriods = [];
    if (course.syllabus_body) {
      try {
        const examResponse = await fetch(
          `${CANVAS_API_URL.replace('/api/v1', '')}/functions/v1/extract-exam-dates`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ syllabusText: course.syllabus_body }),
          }
        );
        
        if (examResponse.ok) {
          const examData = await examResponse.json();
          examPeriods = examData.examPeriods || [];
          console.log(`Found ${examPeriods.length} exam periods`);
        }
      } catch (error) {
        console.error('Error extracting exam dates:', error);
      }
    }
    
    // Fetch assignments for this course
    const assignmentsResponse = await fetch(
      `${CANVAS_API_URL}/api/v1/courses/${courseId}/assignments?per_page=50`,
      {
        headers: {
          'Authorization': `Bearer ${CANVAS_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let assignments = [];
    if (assignmentsResponse.ok) {
      assignments = await assignmentsResponse.json();
    }

    // Calculate course stats
    const upcomingAssignments = assignments.filter((a: any) => {
      if (!a.due_at) return false;
      return new Date(a.due_at) > new Date();
    });

    const totalPoints = assignments.reduce((sum: number, a: any) => sum + (a.points_possible || 0), 0);

    // Format assignments for display
    const formattedAssignments = assignments.map((a: any) => ({
      id: a.id,
      title: a.name,
      dueDate: a.due_at,
      points: a.points_possible,
      description: a.description,
      submissionTypes: a.submission_types,
      htmlUrl: a.html_url,
    }));

    console.log('Course details fetched successfully');

    return new Response(
      JSON.stringify({ 
        course: {
          id: course.id,
          name: course.name,
          courseCode: course.course_code,
          syllabusBody: course.syllabus_body,
          term: course.term?.name,
          startDate: course.start_at,
          endDate: course.end_at,
        },
        stats: {
          totalAssignments: assignments.length,
          upcomingAssignments: upcomingAssignments.length,
          totalPoints,
        },
        assignments: formattedAssignments,
        examPeriods,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error fetching course details:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
