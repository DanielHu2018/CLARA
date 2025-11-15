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

    console.log(`Fetching modules for course ${courseId}...`);
    
    // Fetch course modules
    const modulesResponse = await fetch(
      `${CANVAS_API_URL}/api/v1/courses/${courseId}/modules?include[]=items&per_page=100`,
      {
        headers: {
          'Authorization': `Bearer ${CANVAS_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!modulesResponse.ok) {
      const errorText = await modulesResponse.text();
      console.error('Canvas API error (modules):', modulesResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Canvas API error: ${modulesResponse.status}` }),
        { status: modulesResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const modules = await modulesResponse.json();
    console.log(`Found ${modules.length} modules`);

    // Try to match modules with exam periods based on name/position
    const getExamPeriodForModule = (moduleName: string, position: number) => {
      const lowerName = moduleName.toLowerCase();
      
      // Check for specific exam keywords
      if (lowerName.includes('midterm') || lowerName.includes('mid-term')) {
        return 'Midterm';
      }
      if (lowerName.includes('final')) {
        return 'Final';
      }
      if (lowerName.includes('quiz')) {
        return 'Quiz';
      }
      if (lowerName.includes('exam')) {
        return 'Exam';
      }
      
      // Assign based on position (rough estimate)
      if (position <= 4) return 'Early Course';
      if (position <= 8) return 'Mid Course';
      return 'Late Course';
    };

    // Process modules and items into topics
    const topics = [];
    
    for (const module of modules) {
      const examPeriod = getExamPeriodForModule(module.name, module.position);
      
      // Add module itself as a topic
      topics.push({
        id: `module_${module.id}`,
        name: module.name,
        type: 'module',
        position: module.position,
        items: module.items?.length || 0,
        examPeriod,
      });

      // Add module items as sub-topics
      if (module.items && module.items.length > 0) {
        module.items.forEach((item: any) => {
          topics.push({
            id: `item_${item.id}`,
            name: item.title,
            type: item.type,
            position: item.position,
            moduleId: module.id,
            moduleName: module.name,
            examPeriod,
          });
        });
      }
    }

    console.log(`Total topics: ${topics.length}`);

    return new Response(
      JSON.stringify({ 
        topics,
        totalTopics: topics.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error fetching Canvas modules:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
