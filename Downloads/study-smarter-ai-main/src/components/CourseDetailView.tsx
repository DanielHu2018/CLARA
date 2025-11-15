import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, BookOpen, Calendar, Target, FileText, Clock, ExternalLink, CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Assignment {
  id: number;
  title: string;
  dueDate: string;
  points: number;
  description: string;
  submissionTypes: string[];
  htmlUrl: string;
}

interface CourseDetailViewProps {
  courseId: number;
  courseName: string;
  onBack: () => void;
}

const CourseDetailView = ({ courseId, courseName, onBack }: CourseDetailViewProps) => {
  const [courseDetails, setCourseDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-course-details', {
        body: { courseId }
      });

      if (error) throw error;

      if (data) {
        setCourseDetails(data);
      }
    } catch (error) {
      console.error('Error fetching course details:', error);
      toast({
        title: "Error",
        description: "Could not load course details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Strip HTML tags for display
  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return tmp.textContent || tmp.innerText || '';
  };

  // Filter assignments based on due date
  const getFilteredAssignments = (): Assignment[] => {
    if (!courseDetails?.assignments) return [];
    
    const now = new Date();
    const assignments = courseDetails.assignments;

    switch (filter) {
      case "upcoming":
        return assignments.filter((a: Assignment) => a.dueDate && new Date(a.dueDate) > now);
      case "past":
        return assignments.filter((a: Assignment) => a.dueDate && new Date(a.dueDate) <= now);
      default:
        return assignments;
    }
  };

  const filteredAssignments = getFilteredAssignments();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Courses
        </Button>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading course details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Courses
      </Button>

      {/* Course Header */}
      <Card className="p-6 bg-[var(--gradient-card)]">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-[var(--gradient-primary)] flex items-center justify-center shadow-lg">
            <BookOpen className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground mb-2">{courseName}</h1>
            <p className="text-muted-foreground">{courseDetails?.course?.courseCode}</p>
            {courseDetails?.course?.term && (
              <Badge variant="secondary" className="mt-2">{courseDetails.course.term}</Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Course Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Assignments</p>
              <p className="text-2xl font-bold text-foreground">{courseDetails?.stats?.totalAssignments || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-accent/10">
              <Calendar className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upcoming</p>
              <p className="text-2xl font-bold text-foreground">{courseDetails?.stats?.upcomingAssignments || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-success/10">
              <FileText className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Points</p>
              <p className="text-2xl font-bold text-foreground">{courseDetails?.stats?.totalPoints || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs for Content */}
      <Tabs defaultValue="assignments" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-4 mt-6">
          {/* Assignment Filters */}
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All ({courseDetails?.assignments?.length || 0})
            </Button>
            <Button
              variant={filter === "upcoming" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("upcoming")}
            >
              Upcoming ({courseDetails?.stats?.upcomingAssignments || 0})
            </Button>
            <Button
              variant={filter === "past" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("past")}
            >
              Past
            </Button>
          </div>

          {/* Assignments List */}
          <div className="space-y-3">
            {filteredAssignments.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No assignments found</p>
              </Card>
            ) : (
              filteredAssignments.map((assignment: Assignment) => {
                const isPast = assignment.dueDate && new Date(assignment.dueDate) < new Date();
                const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;

                return (
                  <Card 
                    key={assignment.id} 
                    className="p-4 hover:shadow-[var(--shadow-medium)] transition-[var(--transition-smooth)] cursor-pointer"
                    onClick={() => window.open(assignment.htmlUrl, '_blank')}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${isPast ? 'bg-muted' : 'bg-primary/10'}`}>
                        {isPast ? (
                          <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <Circle className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-foreground">{assignment.title}</h3>
                          <Badge variant={isPast ? "secondary" : "default"}>
                            {assignment.points} pts
                          </Badge>
                        </div>
                        
                        {assignment.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {stripHtml(assignment.description)}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          {dueDate && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>
                                Due {formatDistanceToNow(dueDate, { addSuffix: true })}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            <span>Open in Canvas</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="syllabus" className="mt-6">
          {courseDetails?.course?.syllabusBody ? (
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Course Syllabus
              </h2>
              <div className="prose prose-sm max-w-none bg-secondary/30 p-6 rounded-xl max-h-96 overflow-y-auto">
                <p className="text-foreground whitespace-pre-wrap">{stripHtml(courseDetails.course.syllabusBody)}</p>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No syllabus available for this course</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CourseDetailView;
