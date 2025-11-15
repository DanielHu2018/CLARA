import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, AlertCircle, BookOpen, FileText, Sparkles, Upload } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Assignment {
  id: number | string;
  title: string;
  course?: string;
  courseCode?: string;
  dueDate: string;
  type: string;
  priority: string;
  estimatedTime: string;
  points?: number;
  description?: string;
  submitted?: boolean;
}

interface MidtermsViewProps {
  assignments: Assignment[];
}

const MidtermsView = ({ assignments }: MidtermsViewProps) => {
  const [midterms, setMidterms] = useState<Assignment[]>([]);
  const [syllabusText, setSyllabusText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [courseNotes, setCourseNotes] = useState<Record<string, any[]>>({});
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [notesAnalysis, setNotesAnalysis] = useState<Record<string, any>>({});
  const [isAnalyzing, setIsAnalyzing] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Fetch course notes for all exams
  const fetchCourseNotes = async (courseName: string, examId: string) => {
    setIsLoadingNotes(true);
    try {
      const { data, error } = await supabase
        .from('user_notes')
        .select('*')
        .ilike('course_name', `%${courseName}%`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setCourseNotes(prev => ({
        ...prev,
        [examId]: data || []
      }));
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  // Analyze notes relevance for exam
  const analyzeNotesForExam = async (examId: string, examTopics: string, notes: any[]) => {
    setIsAnalyzing(prev => ({ ...prev, [examId]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('match-study-materials', {
        body: { 
          examTopics,
          courseNotes: notes
        }
      });
      
      if (error) throw error;
      
      setNotesAnalysis(prev => ({
        ...prev,
        [examId]: data
      }));

      toast({
        title: "Analysis Complete",
        description: "Study materials have been matched with exam topics",
      });
    } catch (error) {
      console.error('Error analyzing notes:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze study materials",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(prev => ({ ...prev, [examId]: false }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/msword', // .doc
        'text/plain', // .txt
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
      ];
      
      const validFiles = files.filter(file => {
        const fileExtension = file.name.toLowerCase().split('.').pop();
        return validTypes.includes(file.type) || 
          ['pdf', 'doc', 'docx', 'txt', 'xlsx', 'xls'].includes(fileExtension || '');
      });

      if (validFiles.length === 0) {
        toast({
          title: "Invalid Files",
          description: "Please select PDF, Word, Excel, or text files",
          variant: "destructive",
        });
        return;
      }

      if (validFiles.length < files.length) {
        toast({
          title: "Some Files Skipped",
          description: `${files.length - validFiles.length} invalid file(s) were skipped`,
        });
      }
      
      setSelectedFiles(validFiles);
      toast({
        title: "Files Selected",
        description: `${validFiles.length} file(s) ready to upload`,
      });
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const extractFromFiles = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select at least one file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const allExams: Assignment[] = [];
    let processedCount = 0;
    let errorCount = 0;

    try {
      for (const file of selectedFiles) {
        try {
          const fileType = file.type;
          const fileName = file.name.toLowerCase();
          let extractedText = '';

          // Handle text files directly
          if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
            extractedText = await file.text();
          } else {
            // For PDFs and other document types, use the parse function
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error('Failed to read file'));
              reader.readAsDataURL(file);
            });
            
            const { data: docData, error: docError } = await supabase.functions.invoke('parse-notes-pdf', {
              body: { pdfBase64: base64.split(',')[1] }
            });
            
            if (docError) {
              console.error('PDF parsing error:', docError);
              throw new Error(`Failed to parse PDF "${file.name}": ${docError.message || 'Unknown error'}`);
            }
            
            // Validate that we actually got text back
            if (!docData?.text || docData.text.trim().length === 0) {
              console.error('No text extracted from PDF:', file.name);
              throw new Error(`No text could be extracted from "${file.name}". The PDF may be empty, corrupted, or contain only images/scans without text.`);
            }
            
            extractedText = docData.text;
            console.log(`✓ Extracted ${extractedText.length} characters from ${file.name}`);
          }

          // Validate we have text before trying to extract exams
          if (!extractedText || extractedText.trim().length === 0) {
            throw new Error(`No text content found in ${file.name}`);
          }

          // Extract exam dates from the text
          const { data, error } = await supabase.functions.invoke('extract-exam-dates', {
            body: { syllabusText: extractedText }
          });
          
          if (error) {
            console.error('Exam extraction error:', error);
            throw error;
          }

          console.log(`Exam extraction result for ${file.name}:`, data?.examPeriods?.length || 0, 'exams found');

          if (data?.examPeriods && data.examPeriods.length > 0) {
            const exams: Assignment[] = data.examPeriods.map((exam: any, index: number) => ({
              id: `exam-${file.name}-${index}-${Date.now()}`,
              title: exam.name || 'Exam',
              course: exam.course || file.name.replace(/\.[^/.]+$/, ''), // Use filename as fallback
              courseCode: exam.courseCode || '',
              dueDate: exam.date || new Date().toISOString(),
              type: 'exam',
              priority: 'high',
              estimatedTime: exam.duration || '2-3 hours',
              description: exam.topics?.join(', ') || '',
              submitted: false,
            }));
            
            allExams.push(...exams);
            processedCount++;
          } else {
            processedCount++;
          }
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          errorCount++;
          
          // Show specific error message to user
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          toast({
            title: `Error processing ${file.name}`,
            description: errorMessage,
            variant: "destructive",
          });
        }
      }

      setMidterms(allExams);
      
      if (allExams.length > 0) {
        toast({
          title: "Extraction Complete",
          description: `Found ${allExams.length} exam(s) from ${processedCount} file(s)${errorCount > 0 ? `. ${errorCount} file(s) failed.` : ''}`,
        });
      } else {
        toast({
          title: "No Exams Found",
          description: errorCount > 0 
            ? `No exam dates were found. ${errorCount} file(s) had errors. Check the console for details.`
            : `No exam dates were found in the ${selectedFiles.length} file(s). Make sure your PDFs contain text (not just images) and mention exam dates.`,
          variant: errorCount > 0 ? "destructive" : "default",
        });
      }
    } catch (error) {
      console.error('Error processing files:', error);
      toast({
        title: "Extraction Failed",
        description: "An error occurred while processing files",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const extractExamDates = async () => {
    if (!syllabusText.trim()) {
      toast({
        title: "Empty Syllabus",
        description: "Please enter your syllabus text",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-exam-dates', {
        body: { syllabusText }
      });
      
      if (error) throw error;

      if (data?.examPeriods && data.examPeriods.length > 0) {
        const exams: Assignment[] = data.examPeriods.map((exam: any, index: number) => ({
          id: `exam-${index}`,
          title: exam.name || 'Exam',
          course: exam.course || 'Course',
          courseCode: exam.courseCode || '',
          dueDate: exam.date || new Date().toISOString(),
          type: 'exam',
          priority: 'high',
          estimatedTime: exam.duration || '2-3 hours',
          description: exam.topics?.join(', ') || '',
          submitted: false,
        }));
        
        setMidterms(exams);
        toast({
          title: "Exams Extracted",
          description: `Found ${exams.length} exam(s) in your syllabus`,
        });
      } else {
        toast({
          title: "No Exams Found",
          description: "No exam dates were found in the syllabus",
        });
        setMidterms([]);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Extraction Failed",
        description: "Failed to extract exam dates",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const midtermsByCourse = midterms.reduce((acc, assignment) => {
    const courseName = assignment.course || 'Unknown Course';
    if (!acc[courseName]) {
      acc[courseName] = [];
    }
    acc[courseName].push(assignment);
    return acc;
  }, {} as Record<string, Assignment[]>);

  // Sort exams by date instead of by course
  const sortedExams = [...midterms].sort((a, b) => 
    new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  const formatDueDate = (dateString: string, assignmentId: number | string) => {
    const date = new Date(dateString);
    const now = new Date();
    const daysUntilDue = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    const formattedDate = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    const isSubmitted = assignments.find(a => String(a.id) === String(assignmentId))?.submitted;

    if (date < now && !isSubmitted) {
      return { text: formattedDate, status: 'past', daysText: '' };
    } else if (daysUntilDue === 0) {
      return { text: formattedDate, status: 'today', daysText: 'Today' };
    } else if (daysUntilDue === 1) {
      return { text: formattedDate, status: 'tomorrow', daysText: 'Tomorrow' };
    } else if (daysUntilDue > 0 && daysUntilDue <= 7) {
      return { text: formattedDate, status: 'soon', daysText: `In ${daysUntilDue} days` };
    } else if (daysUntilDue > 7) {
      return { text: formattedDate, status: 'future', daysText: `In ${daysUntilDue} days` };
    } else {
      return { text: formattedDate, status: 'future', daysText: '' };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-accent';
      case 'low': return 'text-muted-foreground';
      default: return 'text-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="backdrop-blur-md bg-background/20 border border-white/20 p-8 rounded-2xl shadow-lg">
        <Card className="bg-background/40 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Extract Exam Dates from Syllabus
            </CardTitle>
            <CardDescription>
              Upload a PDF or paste your course syllabus to automatically extract all exam dates and details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="text" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="text">
                  <FileText className="h-4 w-4 mr-2" />
                  Paste Text
                </TabsTrigger>
                <TabsTrigger value="file">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload PDF
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="text" className="space-y-4">
                <Textarea
                  placeholder="Paste your syllabus here... Include information about midterms, finals, and any other exams."
                  value={syllabusText}
                  onChange={(e) => setSyllabusText(e.target.value)}
                  className="min-h-[200px] bg-background/60"
                />
                <Button 
                  onClick={extractExamDates} 
                  disabled={isExtracting || !syllabusText.trim()}
                  className="w-full"
                >
                  {isExtracting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2"></div>
                      Extracting Exam Dates...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Extract Exam Dates
                    </>
                  )}
                </Button>
              </TabsContent>
              
              <TabsContent value="file" className="space-y-4">
                <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center bg-background/30">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload multiple PDF, Word, Excel, or text files
                    </p>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.xlsx,.xls"
                      onChange={handleFileChange}
                      className="max-w-xs mx-auto"
                      multiple
                    />
                  </div>
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium">
                        Selected {selectedFiles.length} file(s):
                      </p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {selectedFiles.map((file, index) => (
                          <div 
                            key={index}
                            className="flex items-center justify-between gap-2 text-xs text-muted-foreground bg-background/60 px-3 py-1 rounded"
                          >
                            <span className="truncate">{file.name}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeFile(index)}
                              className="h-5 w-5 p-0 hover:bg-destructive/20"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <Button 
                  onClick={extractFromFiles} 
                  disabled={isUploading || selectedFiles.length === 0}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2"></div>
                      Processing {selectedFiles.length} File(s)...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Extract from {selectedFiles.length || ''} File{selectedFiles.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {midterms.length === 0 ? (
        <div className="backdrop-blur-md bg-background/20 border border-white/20 p-8 rounded-2xl shadow-lg">
          <Card className="bg-background/40 backdrop-blur border-border/50">
            <CardContent className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Exam Dates Yet</h3>
              <p className="text-muted-foreground">
                Paste your syllabus above to extract exam dates automatically
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div className="backdrop-blur-md bg-background/20 border border-white/20 p-6 rounded-2xl shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-background/40 backdrop-blur border-border/50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{midterms.length}</div>
                    <div className="text-sm text-muted-foreground">Total Exams</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-background/40 backdrop-blur border-border/50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">
                      {midterms.filter(m => new Date(m.dueDate) >= new Date()).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Upcoming</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-background/40 backdrop-blur border-border/50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {new Set(midterms.map(m => m.course)).size}
                    </div>
                    <div className="text-sm text-muted-foreground">Courses</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Exams with Study Materials */}
          <div className="space-y-6">
            {sortedExams.map((exam) => {
              const { text: formattedDate, status, daysText } = formatDueDate(exam.dueDate, exam.id);
              const examId = String(exam.id);
              const notes = courseNotes[examId] || [];
              const analysis = notesAnalysis[examId];
              const analyzing = isAnalyzing[examId];
              
              return (
                <div key={exam.id} className="backdrop-blur-md bg-background/20 border border-white/20 p-6 rounded-2xl shadow-lg">
                  <Card className="bg-background/40 backdrop-blur border-border/50">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl flex items-center gap-2">
                            {exam.title}
                            <Badge variant="destructive" className="text-xs">
                              {exam.type.toUpperCase()}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {exam.course} {exam.courseCode && `(${exam.courseCode})`}
                          </CardDescription>
                        </div>
                        {daysText && ['today', 'tomorrow', 'soon'].includes(status) && (
                          <Badge
                            variant={
                              status === 'today' ? 'destructive' :
                              status === 'tomorrow' ? 'default' :
                              'secondary'
                            }
                            className="whitespace-nowrap ml-2"
                          >
                            {daysText}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Exam Details */}
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formattedDate}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{exam.estimatedTime}</span>
                          </div>
                          {exam.priority && (
                            <div className="flex items-center gap-1">
                              <AlertCircle className={`h-4 w-4 ${getPriorityColor(exam.priority)}`} />
                              <span className={getPriorityColor(exam.priority)}>
                                {exam.priority.charAt(0).toUpperCase() + exam.priority.slice(1)} Priority
                              </span>
                            </div>
                          )}
                        </div>
                        {exam.description && (
                          <p className="text-sm text-muted-foreground">
                            Topics: {exam.description}
                          </p>
                        )}
                      </div>

                      {/* Study Materials Section */}
                      <div className="border-t border-border/30 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Study Materials for This Exam
                          </h4>
                          <div className="flex gap-2">
                            {!courseNotes[examId] && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => fetchCourseNotes(exam.course || '', examId)}
                                disabled={isLoadingNotes}
                              >
                                {isLoadingNotes ? 'Loading...' : 'Load Notes'}
                              </Button>
                            )}
                            {notes.length > 0 && !analysis && (
                              <Button
                                size="sm"
                                onClick={() => analyzeNotesForExam(examId, exam.description || exam.title, notes)}
                                disabled={analyzing}
                              >
                                {analyzing ? 'Analyzing...' : 'Analyze Relevance'}
                              </Button>
                            )}
                          </div>
                        </div>

                        {analysis && (
                          <div className="mb-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                            <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <Sparkles className="h-4 w-4" />
                              Study Strategy
                            </h5>
                            <p className="text-sm text-muted-foreground">
                              {analysis.overallStrategy}
                            </p>
                          </div>
                        )}
                        
                        {notes.length > 0 ? (
                          <div className="space-y-2">
                            {notes
                              .map((note, idx) => {
                                const match = analysis?.matches?.find((m: any) => m.noteIndex === idx);
                                return { note, match };
                              })
                              .sort((a, b) => (b.match?.relevanceScore || 0) - (a.match?.relevanceScore || 0))
                              .map(({ note, match }) => (
                                <div
                                  key={note.id}
                                  className={`p-3 rounded-lg border transition-all ${
                                    match?.relevanceScore >= 70 
                                      ? 'bg-green-500/10 border-green-500/30' 
                                      : match?.relevanceScore >= 40
                                      ? 'bg-yellow-500/10 border-yellow-500/30'
                                      : 'bg-background/60 border-border/30'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-medium">
                                          {note.module_name || note.chapter_name || 'Course Notes'}
                                        </p>
                                        {match && (
                                          <Badge 
                                            variant={
                                              match.relevanceScore >= 70 ? 'default' :
                                              match.relevanceScore >= 40 ? 'secondary' : 'outline'
                                            }
                                            className="text-xs"
                                          >
                                            {match.relevanceScore}% relevant
                                          </Badge>
                                        )}
                                      </div>
                                      {match?.matchedTopics && match.matchedTopics.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                          {match.matchedTopics.map((topic: string, i: number) => (
                                            <Badge key={i} variant="outline" className="text-xs">
                                              {topic}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                      {match?.studyRecommendation && (
                                        <p className="text-xs text-muted-foreground italic">
                                          💡 {match.studyRecommendation}
                                        </p>
                                      )}
                                    </div>
                                    <Badge variant="outline" className="text-xs shrink-0">
                                      {new Date(note.created_at).toLocaleDateString()}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : courseNotes[examId] ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No notes found for this course yet
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Click "Load Notes" to see study materials
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>

          <div className="backdrop-blur-md bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-200/20 p-6 rounded-2xl shadow-lg">
            <Card className="bg-background/40 backdrop-blur border-purple-200/30 dark:border-purple-800/30">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-purple-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">Study Tip</h3>
                    <p className="text-sm text-purple-800 dark:text-purple-200">
                      Start preparing at least 2 weeks before each exam. Break down your study material into daily chunks and review previous exams if available.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default MidtermsView;
