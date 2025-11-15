import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, RefreshCw, Sparkles, Loader2, Upload, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AudioRecorder from "./AudioRecorder";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface Course {
  id: number;
  name: string;
  course_code: string;
}

interface Topic {
  id: string;
  name: string;
  type: string;
  moduleName?: string;
  examPeriod?: string;
}

interface Assignment {
  id: number;
  title: string;
  course?: string;
  courseCode?: string;
  dueDate: string;
  type: string;
  description?: string;
}

interface HomeworkAnalysis {
  id: string;
  assignment_id: number;
  assignment_title: string;
  topics: string[];
  related_notes: string;
  helpful_examples: string;
}

interface NotesGeneratorProps {
  assignments: Assignment[];
}

interface UserNote {
  id: string;
  course_name: string;
  module_name: string | null;
  chapter_name: string | null;
  organized_content: string | null;
  created_at: string;
}

const NotesGenerator = ({ assignments }: NotesGeneratorProps) => {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [courseTopics, setCourseTopics] = useState<Topic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [generatedNotes, setGeneratedNotes] = useState("");
  const [audioTranscription, setAudioTranscription] = useState("");
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [classNotes, setClassNotes] = useState("");
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [savedNotes, setSavedNotes] = useState<UserNote[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [uploadedPdf, setUploadedPdf] = useState<File | null>(null);
  const [homeworkAnalyses, setHomeworkAnalyses] = useState<HomeworkAnalysis[]>([]);
  const [analyzingHomework, setAnalyzingHomework] = useState<number | null>(null);
  const [selectedNoteForSummary, setSelectedNoteForSummary] = useState<string>("");
  const [noteSummary, setNoteSummary] = useState<string>("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const { toast } = useToast();

  // Fetch all courses on mount
  useEffect(() => {
    fetchAllCourses();
  }, []);

  // Fetch topics when course is selected
  useEffect(() => {
    if (selectedCourse) {
      fetchCourseTopics(parseInt(selectedCourse));
      fetchSavedNotes(parseInt(selectedCourse));
      fetchHomeworkAnalyses();
    } else {
      setCourseTopics([]);
      setSelectedTopics([]);
      setSavedNotes([]);
      setHomeworkAnalyses([]);
    }
  }, [selectedCourse]);

  const fetchAllCourses = async () => {
    setIsLoadingCourses(true);
    try {
      const CANVAS_API_URL = import.meta.env.VITE_SUPABASE_URL?.replace('/rest/v1', '');
      const response = await fetch(`${CANVAS_API_URL}/functions/v1/fetch-canvas-assignments`);
      const data = await response.json();
      
      if (data.courses) {
        setAllCourses(data.courses);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: "Error",
        description: "Could not load courses.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const fetchCourseTopics = async (courseId: number) => {
    setIsLoadingTopics(true);
    setCourseTopics([]);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-canvas-modules', {
        body: { courseId }
      });

      if (error) throw error;

      if (data?.topics) {
        setCourseTopics(data.topics);
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
      toast({
        title: "No Topics Found",
        description: "This course may not have modules set up yet.",
      });
    } finally {
      setIsLoadingTopics(false);
    }
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopics(prev => 
      prev.includes(topicId) 
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  const toggleAllInModule = (moduleName: string) => {
    const moduleTopics = courseTopics
      .filter(t => t.moduleName === moduleName)
      .map(t => t.id);
    
    const allSelected = moduleTopics.every(id => selectedTopics.includes(id));
    
    if (allSelected) {
      setSelectedTopics(prev => prev.filter(id => !moduleTopics.includes(id)));
    } else {
      setSelectedTopics(prev => [...new Set([...prev, ...moduleTopics])]);
    }
  };

  // Group topics by module
  const groupedTopics = courseTopics.reduce((acc, topic) => {
    if (topic.type === 'module') return acc;
    
    const moduleName = topic.moduleName || 'Other Topics';
    const examPeriod = topic.examPeriod || 'General';
    const key = `${examPeriod}|||${moduleName}`;
    
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(topic);
    return acc;
  }, {} as Record<string, Topic[]>);

  // Group by exam period for display
  const examPeriodGroups = Object.entries(groupedTopics).reduce((acc, [key, topics]) => {
    const [examPeriod] = key.split('|||');
    if (!acc[examPeriod]) {
      acc[examPeriod] = {};
    }
    acc[examPeriod][key] = topics;
    return acc;
  }, {} as Record<string, Record<string, Topic[]>>);

  const fetchSavedNotes = async (courseId: number) => {
    setIsLoadingNotes(true);
    try {
      const { data, error } = await supabase
        .from('user_notes')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setSavedNotes(data);
      }
    } catch (error) {
      console.error('Error fetching saved notes:', error);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const fetchHomeworkAnalyses = async () => {
    try {
      const { data, error } = await supabase
        .from('homework_analysis')
        .select('*')
        .order('analyzed_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setHomeworkAnalyses(data);
      }
    } catch (error) {
      console.error('Error fetching homework analyses:', error);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) { // 20MB limit
      toast({
        title: "File Too Large",
        description: "PDF must be less than 20MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadedPdf(file);
    toast({
      title: "PDF Uploaded",
      description: "Click 'Organize My Notes' to process the PDF.",
    });
  };

  const analyzeHomework = async (assignment: Assignment) => {
    if (!assignment.course) return;

    setAnalyzingHomework(assignment.id);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-homework', {
        body: {
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          courseName: assignment.course,
          assignmentDescription: assignment.description || ''
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Homework Analyzed!",
          description: `Found ${data.analysis.topics.length} topics related to this assignment.`,
        });
        fetchHomeworkAnalyses();
      }
    } catch (error) {
      console.error('Error analyzing homework:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze homework. Try again.",
        variant: "destructive",
      });
    } finally {
      setAnalyzingHomework(null);
    }
  };

  const handleOrganizeNotes = async () => {
    if (!selectedCourse) {
      toast({
        title: "Select a Course",
        description: "Please select a course first.",
        variant: "destructive",
      });
      return;
    }

    let notesText = classNotes;

    // If PDF is uploaded, parse it first
    if (uploadedPdf) {
      setIsOrganizing(true);
      try {
        const formData = new FormData();
        formData.append('pdf', uploadedPdf);

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-notes-pdf`,
          {
            method: 'POST',
            body: formData,
          }
        );

        const result = await response.json();
        
        if (result.success) {
          notesText = result.text;
          toast({
            title: "PDF Parsed",
            description: "Extracting content from PDF...",
          });
        }
      } catch (error) {
        console.error('Error parsing PDF:', error);
        toast({
          title: "PDF Parse Failed",
          description: "Could not read PDF. Try pasting text instead.",
          variant: "destructive",
        });
        setIsOrganizing(false);
        return;
      }
    }

    if (!notesText.trim()) {
      toast({
        title: "Enter Notes",
        description: "Please enter your class notes or upload a PDF.",
        variant: "destructive",
      });
      setIsOrganizing(false);
      return;
    }

    setIsOrganizing(true);
    try {
      const course = allCourses.find(c => c.id === parseInt(selectedCourse));
      
      const { data, error } = await supabase.functions.invoke('organize-class-notes', {
        body: { 
          rawNotes: notesText,
          courseId: parseInt(selectedCourse),
          courseName: course?.name,
          availableModules: courseTopics.filter(t => t.type === 'module')
        }
      });

      if (error) throw error;

      if (data?.success) {
        setClassNotes("");
        setUploadedPdf(null);
        toast({
          title: "Notes Organized!",
          description: `Your notes have been organized under "${data.module_name}" > "${data.chapter_name}"`,
        });
        // Refresh saved notes
        fetchSavedNotes(parseInt(selectedCourse));
      }
    } catch (error) {
      console.error('Error organizing notes:', error);
      toast({
        title: "Organization Failed",
        description: "Could not organize notes. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsOrganizing(false);
    }
  };

  const handleGenerateNotes = async () => {
    if (!selectedCourse) {
      toast({
        title: "Select a Course",
        description: "Please select a course first.",
        variant: "destructive",
      });
      return;
    }

    if (selectedTopics.length === 0) {
      toast({
        title: "Select Topics",
        description: "Please select at least one topic.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const course = allCourses.find(c => c.id === parseInt(selectedCourse));
      const topicsToGenerate = courseTopics
        .filter(t => selectedTopics.includes(t.id))
        .map(t => t.name);

      const { data, error } = await supabase.functions.invoke('generate-study-notes', {
        body: { 
          topic: topicsToGenerate.join(', '),
          course: course?.name,
          assignments: assignments.filter(a => a.course === course?.name),
          audioTranscription: audioTranscription || undefined
        }
      });

      if (error) throw error;

      if (data?.notes) {
        setGeneratedNotes(data.notes);
        toast({
          title: "Notes Generated!",
          description: `Created notes for ${selectedTopics.length} topic(s).`,
        });
      }
    } catch (error) {
      console.error('Error generating notes:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate notes. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSummarizeNote = async () => {
    if (!selectedNoteForSummary) {
      toast({
        title: "Select a Note",
        description: "Please select a note to summarize.",
        variant: "destructive",
      });
      return;
    }

    const note = savedNotes.find(n => n.id === selectedNoteForSummary);
    if (!note || !note.organized_content) {
      toast({
        title: "Invalid Note",
        description: "Selected note has no content.",
        variant: "destructive",
      });
      return;
    }

    setIsSummarizing(true);
    setNoteSummary("");

    try {
      const course = allCourses.find(c => c.id === parseInt(selectedCourse));
      
      const { data, error } = await supabase.functions.invoke('summarize-notes', {
        body: {
          notesText: note.organized_content,
          courseName: course?.name || note.course_name,
          chapterName: note.chapter_name || note.module_name
        }
      });

      if (error) throw error;

      if (data?.success && data?.summary) {
        setNoteSummary(data.summary);
        toast({
          title: "Summary Created!",
          description: "Your notes have been simplified and summarized.",
        });
      } else {
        throw new Error(data?.error || 'Failed to generate summary');
      }
    } catch (error: any) {
      console.error('Error summarizing notes:', error);
      toast({
        title: "Summarization Failed",
        description: error.message || "Could not summarize notes. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 mb-6">
          <BookOpen className="w-6 h-6 text-primary" />
          AI Notes Generator
        </h2>

        <div className="space-y-6">
          {/* Step 1: Select Course */}
          <div>
            <Label htmlFor="course" className="text-base font-semibold">
              1. Select Course <span className="text-destructive">*</span>
            </Label>
            <Select 
              value={selectedCourse} 
              onValueChange={setSelectedCourse}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder={isLoadingCourses ? "Loading courses..." : "Choose a course"} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingCourses ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading courses...</span>
                  </div>
                ) : allCourses.length > 0 ? (
                  allCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.course_code} - {course.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    No courses found
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Select Topics */}
          {selectedCourse && (
            <div>
              <Label className="text-base font-semibold mb-3 block">
                2. Select Topics <span className="text-destructive">*</span>
              </Label>
              
              {isLoadingTopics ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading topics...</span>
                </div>
              ) : courseTopics.length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(examPeriodGroups).map(([examPeriod, moduleGroups]) => (
                    <div key={examPeriod} className="space-y-3">
                      {/* Exam Period Header */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                        <h4 className="text-sm font-bold text-primary uppercase tracking-wider px-3 py-1 bg-primary/5 rounded-full">
                          {examPeriod}
                        </h4>
                        <div className="h-px flex-1 bg-gradient-to-r from-primary/30 via-transparent to-transparent" />
                      </div>
                      
                      {/* Modules within this exam period */}
                      {Object.entries(moduleGroups).map(([key, topics]) => {
                        const [, moduleName] = key.split('|||');
                        const allModuleSelected = topics.every(t => selectedTopics.includes(t.id));
                        
                        return (
                          <Card key={key} className="p-4 bg-secondary/20">
                            <div className="space-y-3">
                              {/* Module Header with Select All */}
                              <div className="flex items-center space-x-3 pb-2 border-b border-border">
                                <Checkbox
                                  id={`module-${key}`}
                                  checked={allModuleSelected}
                                  onCheckedChange={() => toggleAllInModule(moduleName)}
                                />
                                <label
                                  htmlFor={`module-${key}`}
                                  className="flex-1 cursor-pointer font-semibold text-foreground"
                                >
                                  {moduleName}
                                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                                    ({topics.length} topics)
                                  </span>
                                </label>
                              </div>
                              
                              {/* Module Topics */}
                              <div className="space-y-2 pl-6">
                                {topics.map((topic) => (
                                  <div key={topic.id} className="flex items-start space-x-3 p-2 hover:bg-background/50 rounded-lg transition-colors">
                                    <Checkbox
                                      id={topic.id}
                                      checked={selectedTopics.includes(topic.id)}
                                      onCheckedChange={() => toggleTopic(topic.id)}
                                    />
                                    <label
                                      htmlFor={topic.id}
                                      className="flex-1 cursor-pointer leading-tight"
                                    >
                                      <span className="text-sm text-foreground">{topic.name}</span>
                                      <span className="block text-xs text-muted-foreground mt-0.5 capitalize">
                                        {topic.type}
                                      </span>
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-border rounded-lg">
                  <p className="text-muted-foreground">No topics found for this course.</p>
                  <p className="text-sm text-muted-foreground mt-1">The course may not have modules set up.</p>
                </div>
              )}

              {selectedTopics.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedTopics.length} topic{selectedTopics.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          {/* Step 3: Optional Lecture Recording */}
          {selectedCourse && (
            <div>
              <Label className="text-base font-semibold mb-3 block">
                3. Record Lecture Audio (Optional)
              </Label>
              <div className="space-y-3">
                <AudioRecorder 
                  onTranscriptionComplete={(text) => {
                    setAudioTranscription(prev => prev ? `${prev}\n\n${text}` : text);
                  }} 
                />
                {audioTranscription && (
                  <div className="space-y-2">
                    <Label className="text-sm">Transcribed Lecture Content:</Label>
                    <Textarea
                      value={audioTranscription}
                      onChange={(e) => setAudioTranscription(e.target.value)}
                      placeholder="Your lecture transcription will appear here..."
                      className="min-h-32 max-h-64"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAudioTranscription("")}
                    >
                      Clear Transcription
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerateNotes}
            disabled={!selectedCourse || selectedTopics.length === 0 || isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Study Notes
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Input Your Own Class Notes */}
      {selectedCourse && (
        <Card className="p-6 bg-accent/5 border-accent/30">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-accent" />
            Input Your Class Notes
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Paste your notes from class OR upload a PDF, and AI will automatically organize them into the correct chapter and section!
          </p>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Upload PDF (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  className="flex-1"
                />
                {uploadedPdf && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUploadedPdf(null)}
                  >
                    Clear
                  </Button>
                )}
              </div>
              {uploadedPdf && (
                <p className="text-xs text-muted-foreground mt-1">
                  <FileText className="w-3 h-3 inline mr-1" />
                  {uploadedPdf.name} ({(uploadedPdf.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Or Paste Text Notes</Label>
              <Textarea
                value={classNotes}
                onChange={(e) => setClassNotes(e.target.value)}
                placeholder="Paste your class notes here...&#10;&#10;For example:&#10;- Today we covered recursion basics&#10;- The base case is crucial to prevent infinite loops&#10;- We looked at factorial examples"
                className="min-h-40"
                disabled={!!uploadedPdf}
              />
            </div>

            <Button
              onClick={handleOrganizeNotes}
              disabled={(!classNotes.trim() && !uploadedPdf) || isOrganizing}
              className="w-full"
            >
              {isOrganizing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Organizing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Organize My Notes
                </>
              )}
            </Button>
          </div>
        </Card>
      )}


      {/* Display Saved Organized Notes */}
      {selectedCourse && savedNotes.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Your Organized Notes
          </h3>
          
          {isLoadingNotes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading notes...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Group notes by module */}
              {Object.entries(
                savedNotes.reduce((acc, note) => {
                  const module = note.module_name || 'Uncategorized';
                  if (!acc[module]) acc[module] = [];
                  acc[module].push(note);
                  return acc;
                }, {} as Record<string, UserNote[]>)
              ).map(([moduleName, moduleNotes]) => (
                <div key={moduleName} className="space-y-3">
                  <h4 className="font-semibold text-foreground border-b border-border pb-2">
                    {moduleName}
                  </h4>
                  {moduleNotes.map((note) => (
                    <Card key={note.id} className="p-4 bg-secondary/20">
                      <div className="space-y-2">
                        {note.chapter_name && (
                          <h5 className="font-medium text-sm text-primary">{note.chapter_name}</h5>
                        )}
                        <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                          {note.organized_content}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Added {new Date(note.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* AI Note Summarization Section */}
      {selectedCourse && savedNotes.length > 0 && (
        <Card className="p-6 bg-gradient-to-r from-accent/5 to-primary/5 border-accent/30">
          <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            AI Note Summarizer
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Select any of your saved notes below and AI will create a simple, sweet summary perfect for quick review!
          </p>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Select Note to Summarize</Label>
              <Select 
                value={selectedNoteForSummary || ""} 
                onValueChange={setSelectedNoteForSummary}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a note to summarize..." />
                </SelectTrigger>
                <SelectContent>
                  {savedNotes.map((note) => (
                    <SelectItem key={note.id} value={note.id}>
                      {note.module_name || 'Uncategorized'} - {note.chapter_name || 'Notes'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedNoteForSummary && (
              <div className="space-y-3">
                <div className="p-4 bg-background/50 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-2">Original Note Preview:</p>
                  <p className="text-sm text-foreground line-clamp-3">
                    {savedNotes.find(n => n.id === selectedNoteForSummary)?.organized_content?.substring(0, 200)}...
                  </p>
                </div>

                <Button
                  onClick={handleSummarizeNote}
                  disabled={isSummarizing}
                  className="w-full"
                >
                  {isSummarizing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Summarizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Create Simple Summary
                    </>
                  )}
                </Button>
              </div>
            )}

            {noteSummary && (
              <Card className="p-4 bg-accent/10 border-accent/30">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    Simple Summary
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(noteSummary);
                      toast({ title: "Copied!", description: "Summary copied to clipboard." });
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <div className="prose prose-sm max-w-none bg-background/50 p-4 rounded-lg">
                  <div className="text-foreground whitespace-pre-wrap">{noteSummary}</div>
                </div>
              </Card>
            )}
          </div>
        </Card>
      )}

      {generatedNotes && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-foreground">Generated Notes</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(generatedNotes);
                toast({ title: "Copied!", description: "Notes copied to clipboard." });
              }}
            >
              Copy
            </Button>
          </div>
          <div className="prose prose-sm max-w-none bg-secondary/30 p-6 rounded-xl max-h-96 overflow-y-auto">
            <div className="text-foreground whitespace-pre-wrap">{generatedNotes}</div>
          </div>
        </Card>
      )}

      <Card className="p-6 bg-primary/5 border-primary/20">
        <p className="text-sm text-foreground">
          <strong>💡 How it works:</strong> Select your course, choose topics, optionally record your lecture for additional context, and the AI will generate comprehensive study notes tailored to those topics based on your Canvas materials, assignments, and lecture content.
        </p>
      </Card>
    </div>
  );
};

export default NotesGenerator;
