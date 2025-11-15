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

    console.log('Fetching calendar events from Canvas...');
    
    // Fetch upcoming calendar events (class schedule)
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Next 30 days

    const eventsResponse = await fetch(
      `${CANVAS_API_URL}/api/v1/calendar_events?start_date=${startDate}&end_date=${endDate}&per_page=200`,
      {
        headers: {
          'Authorization': `Bearer ${CANVAS_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!eventsResponse.ok) {
      const errorText = await eventsResponse.text();
      console.error('Canvas API error (calendar):', eventsResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Canvas API error: ${eventsResponse.status}` }),
        { status: eventsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const events = await eventsResponse.json();
    console.log(`Found ${events.length} calendar events`);

    // Process and categorize events
    const schedule = events
      .filter((e: any) => e.start_at && e.end_at)
      .map((event: any) => {
        const startTime = new Date(event.start_at);
        const endTime = new Date(event.end_at);
        const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes

        return {
          id: event.id,
          title: event.title,
          type: event.type || 'event',
          startTime: event.start_at,
          endTime: event.end_at,
          duration,
          location: event.location_name,
          contextName: event.context_name, // Course name
          description: event.description,
        };
      })
      .sort((a: any, b: any) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

    console.log(`Processed ${schedule.length} schedule items`);

    return new Response(
      JSON.stringify({ 
        schedule,
        totalEvents: schedule.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error fetching Canvas schedule:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
