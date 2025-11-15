-- Add unique constraint to homework_analysis
ALTER TABLE public.homework_analysis
ADD CONSTRAINT homework_analysis_user_assignment_unique 
UNIQUE (user_id, assignment_id);