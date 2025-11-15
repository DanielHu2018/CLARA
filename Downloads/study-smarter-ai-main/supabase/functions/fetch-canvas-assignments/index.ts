import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CanvasAssignment {
  id: number;
  name: string;
  due_at: string | null;
  course_id: number;
  assignment_group_id: number;
  points_possible: number;
  submission_types: string[];
  description: string;
  submission?: {
    workflow_state: string;
    submitted_at: string | null;
    grade?: string;
  };
}

interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
}

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

    const courses: CanvasCourse[] = await coursesResponse.json();
    console.log(`Found ${courses.length} courses`);

    // Fetch assignments for all courses
    const allAssignments = [];
    
    for (const course of courses) {
      console.log(`Fetching assignments for course: ${course.name}`);
      
      // Fetch assignments with submission status
      const assignmentsResponse = await fetch(
        `${CANVAS_API_URL}/api/v1/courses/${course.id}/assignments?include[]=submission&per_page=50`,
        {
          headers: {
            'Authorization': `Bearer ${CANVAS_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (assignmentsResponse.ok) {
        const assignments: CanvasAssignment[] = await assignmentsResponse.json();
        
        // Enrich assignments with course info and categorize them
        const enrichedAssignments = assignments
          .filter(a => a.due_at) // Only assignments with due dates
          .map(assignment => {
            // Determine assignment type based on submission types and name
            let type = 'homework';
            const nameLower = assignment.name.toLowerCase();
            
            if (nameLower.includes('exam') || nameLower.includes('test') || nameLower.includes('quiz')) {
              type = 'exam';
            } else if (nameLower.includes('lab')) {
              type = 'lab';
            } else if (nameLower.includes('reading') || nameLower.includes('chapter')) {
              type = 'reading';
            } else if (nameLower.includes('project')) {
              type = 'project';
            }

            // Estimate time based on points and type
            let estimatedTime = 30; // default 30 minutes
            if (assignment.points_possible) {
              estimatedTime = Math.min(Math.max(assignment.points_possible * 3, 20), 180);
            }

            // Determine priority based on due date, points, and submission status
            const dueDate = new Date(assignment.due_at!);
            const now = new Date();
            const daysUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
            
            // Check if assignment is submitted or graded
            const isSubmitted = assignment.submission?.workflow_state === 'submitted' || 
                               assignment.submission?.workflow_state === 'graded' ||
                               assignment.submission?.workflow_state === 'pending_review' ||
                               false;
            
            let priority = 'medium';
            
            // If already submitted, not high priority
            if (isSubmitted) {
              priority = 'low';
            }
            // Unsubmitted and due very soon (within 2 days) = high priority
            else if (daysUntilDue <= 2) {
              priority = 'high';
            } 
            // Unsubmitted but worth a lot of points (100+) and due within a week = high priority
            else if (daysUntilDue <= 7 && assignment.points_possible >= 100) {
              priority = 'high';
            }
            // Far away deadline and low points = low priority
            else if (daysUntilDue > 7 && assignment.points_possible < 50) {
              priority = 'low';
            }

            return {
              id: assignment.id,
              title: assignment.name,
              course: course.name,
              courseCode: course.course_code,
              dueDate: assignment.due_at,
              type,
              priority,
              estimatedTime: `${Math.round(estimatedTime)} min`,
              points: assignment.points_possible,
              description: assignment.description || '',
              submitted: isSubmitted,
            };
          });
        
        allAssignments.push(...enrichedAssignments);
      }
    }

    // Sort by due date (safe because we filtered for non-null due dates)
    allAssignments.sort((a, b) => {
      const dateA = new Date(a.dueDate as string).getTime();
      const dateB = new Date(b.dueDate as string).getTime();
      return dateA - dateB;
    });

    console.log(`Total assignments fetched: ${allAssignments.length}`);

    return new Response(
      JSON.stringify({ 
        assignments: allAssignments,
        courses: courses.map(c => ({ id: c.id, name: c.name, code: c.course_code }))
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error fetching Canvas data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
