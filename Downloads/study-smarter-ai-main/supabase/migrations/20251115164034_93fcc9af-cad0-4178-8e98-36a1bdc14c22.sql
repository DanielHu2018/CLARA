-- Create a table for homework analysis
CREATE TABLE public.homework_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  assignment_id INTEGER NOT NULL,
  assignment_title TEXT NOT NULL,
  course_name TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT '{}',
  related_notes TEXT,
  helpful_examples TEXT,
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.homework_analysis ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own homework analysis" 
ON public.homework_analysis 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own homework analysis" 
ON public.homework_analysis 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own homework analysis" 
ON public.homework_analysis 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own homework analysis" 
ON public.homework_analysis 
FOR DELETE 
USING (auth.uid() = user_id);