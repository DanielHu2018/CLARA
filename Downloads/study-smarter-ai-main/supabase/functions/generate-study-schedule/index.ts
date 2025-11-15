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
    const { classSchedule, clubActivities, assignments, examDates } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Calculate the next 7 days starting from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next7Days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      next7Days.push(date.toISOString().split('T')[0]);
    }

    console.log('Generating study schedule for days:', next7Days);

    // Extract unique classes from assignments
    const uniqueClasses = new Set<string>();
    if (assignments && Array.isArray(assignments)) {
      assignments.forEach((a: any) => {
        if (a.course) uniqueClasses.add(a.course);
        if (a.courseCode) uniqueClasses.add(a.courseCode);
      });
    }
    const classList = Array.from(uniqueClasses);

    const systemPrompt = `You are a study schedule generator. Create study blocks that:
1. SPREAD OUT each class across different days (don't put all Math blocks on one day)
2. Include 15-30 minute BREAKS between study blocks
3. Fill ALL available free time slots from 9:00 AM to 10:00 PM (DO NOT schedule anything before 9am)
4. Each study block should be 1-2 hours long
5. Distribute classes evenly - if there are 3 classes, spread them across the week

IMPORTANT:
- NEVER schedule study blocks before 9:00 AM
- Start times must be 09:00 or later
- All times in 24-hour format (09:00, 10:00, etc.)

Return JSON with study blocks. Each block needs:
- day: YYYY-MM-DD format
- startTime: HH:MM format (24-hour, must be 09:00 or later)
- endTime: HH:MM format (24-hour)
- subject: "Class Name - Topic" OR "Break" for breaks
- task: What to do (or "Rest and recharge" for breaks)
- method: Study method (or "Rest" for breaks)
- priority: "low", "medium", or "high" (breaks are "low")`;

    // Build schedule with busy times
    const scheduleSummary = next7Days.map(day => {
      const dayDate = new Date(day);
      const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      const busyTimes: string[] = [];
      
      if (classSchedule && Array.isArray(classSchedule)) {
        classSchedule.forEach((event: any) => {
          const eventDate = new Date(event.startTime);
          if (eventDate.toISOString().split('T')[0] === day) {
            const start = eventDate.toTimeString().slice(0, 5);
            const end = new Date(event.endTime).toTimeString().slice(0, 5);
            busyTimes.push(`${start}-${end}: ${event.title || 'Class'}`);
          }
        });
      }
      
      if (clubActivities && Array.isArray(clubActivities)) {
        clubActivities.forEach((club: any) => {
          const dayDate = new Date(day);
          if (dayDate.getDay() === club.day_of_week) {
            busyTimes.push(`${club.start_time || '00:00'}-${club.end_time || '00:00'}: ${club.title || 'Activity'}`);
          }
        });
      }
      
      return {
        day,
        dayName,
        busyTimes: busyTimes.length > 0 ? busyTimes : ['No classes/activities - full day available']
      };
    });

    const userPrompt = `Generate study blocks for the next 7 days. IMPORTANT: 
- Spread each class across different days
- Add breaks between study blocks
- DO NOT schedule before 9am
- DO NOT schedule during class times or club activities (check the BUSY TIMES below)
- Only schedule in FREE TIME slots

AVAILABLE CLASSES TO STUDY: ${classList.join(', ') || 'General subjects'}

SCHEDULE (BUSY TIMES - DO NOT schedule study during these):
${JSON.stringify(scheduleSummary, null, 2)}

ASSIGNMENTS:
${JSON.stringify(assignments?.slice(0, 10) || [], null, 2)}

EXAMS:
${JSON.stringify(examDates || [], null, 2)}

CRITICAL INSTRUCTIONS:
1. SPREAD OUT classes - don't put all blocks for one class on the same day
2. Add 15-30 minute BREAKS between study blocks
3. Fill ALL free time slots from 9:00 AM to 10:00 PM (NO blocks before 9am)
4. DO NOT schedule during BUSY TIMES listed above
5. Generate blocks for ALL 7 days: ${next7Days.join(', ')}
6. Each day should have 3-5 study blocks (only in free time)

Return JSON in this format:
{
  "studyBlocks": [
    {
      "day": "2025-01-15",
      "startTime": "09:00",
      "endTime": "11:00",
      "subject": "Math - Chapter 5 Review",
      "task": "Review notes and practice problems",
      "method": "Active Recall",
      "priority": "medium"
    }
  ]
}`;

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
        response_format: { type: "json_object" },
        temperature: 0.5
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.', schedule: [] }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.', schedule: [] }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data, null, 2));

    // Try to extract study blocks from response
    let studyBlocks: any[] = [];
    
    const content = data.choices?.[0]?.message?.content || '';
    if (content) {
      try {
        const parsed = JSON.parse(content);
        if (parsed.studyBlocks && Array.isArray(parsed.studyBlocks)) {
          studyBlocks = parsed.studyBlocks;
        } else if (Array.isArray(parsed)) {
          studyBlocks = parsed;
        }
      } catch (e) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.studyBlocks && Array.isArray(parsed.studyBlocks)) {
              studyBlocks = parsed.studyBlocks;
            }
          } catch (e2) {
            console.error('Failed to parse JSON from content:', e2);
          }
        }
      }
    }

    // Fallback: Generate blocks with breaks and spread classes
    if (studyBlocks.length === 0) {
      console.warn('No blocks from AI, generating fallback blocks');
      studyBlocks = generateFallbackBlocks(next7Days, classSchedule, clubActivities, assignments, classList);
    } else {
      // Post-process: Ensure breaks are added and classes are spread
      studyBlocks = addBreaksAndSpreadClasses(studyBlocks, next7Days, classList);
    }

    console.log(`Returning ${studyBlocks.length} study blocks`);

    return new Response(
      JSON.stringify({ schedule: studyBlocks }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-study-schedule:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        schedule: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Function to add breaks and ensure classes are spread out
function addBreaksAndSpreadClasses(
  blocks: any[],
  days: string[],
  classList: string[]
): any[] {
  const result: any[] = [];
  const blocksByDay: Record<string, any[]> = {};
  
  // Group blocks by day
  blocks.forEach(block => {
    if (!blocksByDay[block.day]) blocksByDay[block.day] = [];
    blocksByDay[block.day].push(block);
  });
  
  // Process each day
  days.forEach(day => {
    const dayBlocks = blocksByDay[day] || [];
    if (dayBlocks.length === 0) return;
    
    // Sort by start time
    dayBlocks.sort((a, b) => {
      const timeA = a.startTime.split(':').map(Number);
      const timeB = b.startTime.split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });
    
    // Add blocks with breaks between them
    dayBlocks.forEach((block, idx) => {
      result.push(block);
      
      // Add break after each block (except the last one)
      if (idx < dayBlocks.length - 1) {
        const endTime = block.endTime.split(':').map(Number);
        const nextStart = dayBlocks[idx + 1].startTime.split(':').map(Number);
        const endMinutes = endTime[0] * 60 + endTime[1];
        const nextMinutes = nextStart[0] * 60 + nextStart[1];
        
        // Only add break if there's at least 15 minutes gap
        if (nextMinutes - endMinutes >= 15) {
          const breakStart = new Date(`2000-01-01T${block.endTime}`);
          const breakEnd = new Date(breakStart.getTime() + 30 * 60000); // 30 min break
          const breakStartStr = breakEnd.toTimeString().slice(0, 5);
          const breakEndStr = dayBlocks[idx + 1].startTime;
          
          result.push({
            day,
            startTime: block.endTime,
            endTime: breakStartStr,
            subject: 'Break',
            task: 'Rest and recharge',
            method: 'Rest',
            priority: 'low'
          });
        }
      }
    });
  });
  
  return result;
}

// Helper function to check if a time slot conflicts with busy times
function hasConflict(
  day: string,
  startTime: string,
  endTime: string,
  classSchedule: any[],
  clubActivities: any[]
): boolean {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  
  // Check class schedule conflicts
  if (classSchedule && Array.isArray(classSchedule)) {
    for (const event of classSchedule) {
      const eventDate = new Date(event.startTime);
      const eventDay = eventDate.toISOString().split('T')[0];
      
      if (eventDay === day) {
        const eventStart = parseTimeToMinutes(eventDate.toTimeString().slice(0, 5));
        const eventEnd = parseTimeToMinutes(new Date(event.endTime).toTimeString().slice(0, 5));
        
        // Check for overlap
        if (start < eventEnd && end > eventStart) {
          return true;
        }
      }
    }
  }
  
  // Check club activity conflicts
  if (clubActivities && Array.isArray(clubActivities)) {
    const dayDate = new Date(day);
    const dayOfWeek = dayDate.getDay();
    
    for (const club of clubActivities) {
      if (club.day_of_week === dayOfWeek) {
        const clubStart = parseTimeToMinutes(club.start_time || '00:00');
        const clubEnd = parseTimeToMinutes(club.end_time || '00:00');
        
        // Check for overlap
        if (start < clubEnd && end > clubStart) {
          return true;
        }
      }
    }
  }
  
  return false;
}

function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

// Fallback function with breaks, spread classes, and conflict detection
function generateFallbackBlocks(
  days: string[],
  classSchedule: any[],
  clubActivities: any[],
  assignments: any[],
  classList: string[]
): any[] {
  const blocks: any[] = [];
  const subjects = classList.length > 0 ? classList : ['Math', 'Science', 'English', 'History', 'General Review'];
  
  // Available time slots (9am to 10pm, in 2-hour blocks)
  const availableSlots = [
    { start: '09:00', end: '11:00' },
    { start: '11:00', end: '13:00' },
    { start: '13:00', end: '15:00' },
    { start: '15:00', end: '17:00' },
    { start: '17:00', end: '19:00' },
    { start: '19:00', end: '21:00' },
    { start: '21:00', end: '22:00' }
  ];
  
  // Distribute subjects across days
  days.forEach((day, dayIdx) => {
    let slotIdx = 0;
    let subjectIdx = 0;
    
    availableSlots.forEach((slot) => {
      // Check for conflicts
      if (!hasConflict(day, slot.start, slot.end, classSchedule, clubActivities)) {
        const subject = subjects[subjectIdx % subjects.length];
        
        blocks.push({
          day,
          startTime: slot.start,
          endTime: slot.end,
          subject: `${subject} - Review and Practice`,
          task: 'Review notes and complete practice problems',
          method: 'Active Recall',
          priority: slotIdx === 0 ? 'high' : 'medium'
        });
        
        subjectIdx++;
        slotIdx++;
        
        // Add break after study block if there's a next slot
        const nextSlot = availableSlots[availableSlots.indexOf(slot) + 1];
        if (nextSlot && !hasConflict(day, slot.end, nextSlot.start, classSchedule, clubActivities)) {
          // Only add break if there's at least 15 minutes gap
          const breakEnd = nextSlot.start;
          const gapMinutes = parseTimeToMinutes(breakEnd) - parseTimeToMinutes(slot.end);
          
          if (gapMinutes >= 15) {
            blocks.push({
              day,
              startTime: slot.end,
              endTime: breakEnd,
              subject: 'Break',
              task: 'Rest and recharge',
              method: 'Rest',
              priority: 'low'
            });
          }
        }
      }
    });
  });
  
  return blocks;
}