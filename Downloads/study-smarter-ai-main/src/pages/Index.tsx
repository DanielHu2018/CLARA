import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Calendar, CheckCircle2, Clock, TrendingUp, Zap, BookOpen, Target, AlertCircle, RefreshCw, Sparkles, FileText, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ScheduleView from "@/components/ScheduleView";
import NotesGenerator from "@/components/NotesGenerator";
import MidtermsView from "@/components/MidtermsView";
import CourseStarSystem from "@/components/CourseStarSystem";
import CourseDetailView from "@/components/CourseDetailView";
import { BackgroundSelector } from "@/components/BackgroundSelector";
import { ClubActivityManager } from "@/components/ClubActivityManager";
import { Auth } from "@/components/Auth";
import { ClassScheduleInput } from "@/components/ClassScheduleInput";
import { InspirationalQuote } from "@/components/InspirationalQuote";
import QuizView from "@/components/QuizView";

interface Assignment {
  id: number;
  title: string;
  course?: string;
  courseCode?: string;
  dueDate: string;
  type: string;
  priority: string;
  estimatedTime: string;
  points?: number;
  description?: string;
  method?: string;
  submitted?: boolean;
}

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [scheduleEvents, setScheduleEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedCourseName, setSelectedCourseName] = useState<string>("");
  const [background, setBackground] = useState<string>(() => {
    return localStorage.getItem('dashboard-background') || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  });
  const { toast } = useToast();

  const handleBackgroundChange = (newBackground: string) => {
    setBackground(newBackground);
    localStorage.setItem('dashboard-background', newBackground);
  };

  const fetchCanvasAssignments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-canvas-assignments');
      
      if (error) throw error;
      
      if (data?.assignments) {
        // Add AI-recommended study methods
        const methodMap: Record<string, string> = {
          'exam': 'Active Recall + Spaced Repetition',
          'homework': 'Practice Problems First',
          'reading': 'SQ3R Method',
          'lab': 'Structured Writing',
          'project': 'Chunking + Time Blocking'
        };
        
        const enriched = data.assignments.map((a: Assignment) => ({
          ...a,
          method: methodMap[a.type] || 'Active Recall'
        }));
        
        setAssignments(enriched);
        setCourses(data.courses || []);
        toast({
          title: "Canvas Synced!",
          description: `Loaded ${enriched.length} assignments from Canvas`,
        });
      }
    } catch (error) {
      console.error('Error fetching Canvas assignments:', error);
      toast({
        title: "Connection Error",
        description: "Couldn't fetch Canvas assignments. Check your credentials.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClassSchedule = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-canvas-schedule');
      
      if (error) throw error;
      
      if (data?.schedule) {
        setScheduleEvents(data.schedule);
      }
    } catch (error) {
      console.error('Error fetching class schedule:', error);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchCanvasAssignments();
      fetchClassSchedule();
    }
  }, [user]);

  // Get today's assignments (due within 24 hours)
  const todayTasks = assignments.filter(a => {
    const dueDate = new Date(a.dueDate);
    const now = new Date();
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilDue <= 24 && hoursUntilDue > 0;
  }).slice(0, 5);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    toast({
      title: "Logged Out",
      description: "Successfully logged out"
    });
  };

  if (!user) {
    return <Auth />;
  }

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{
        background,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Animated Stars */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/60 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>
      
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background/70 backdrop-blur-[2px] z-1" />
      
      {/* Content */}
      <div className="relative z-10">
      {/* Hero Section */}
      <header className="border-b border-border/50 bg-card/90 backdrop-blur-lg sticky top-0 z-50 shadow-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--gradient-primary)] flex items-center justify-center shadow-[var(--shadow-glow)]">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-[var(--gradient-primary)] bg-clip-text text-transparent">
                LearnFlow AI
              </span>
            </div>
            <div className="flex items-center gap-2">
              {user && (
                <ClassScheduleInput 
                  userId={user.id}
                  onScheduleAdded={fetchClassSchedule}
                  courses={courses}
                />
              )}
              <BackgroundSelector 
                currentBackground={background}
                onBackgroundChange={handleBackgroundChange}
              />
              <nav className="flex gap-2">
                <Button 
                  variant={activeTab === "dashboard" ? "default" : "ghost"}
                  onClick={() => setActiveTab("dashboard")}
                >
                  Dashboard
                </Button>
              <Button 
                variant={activeTab === "schedule" ? "default" : "ghost"}
                onClick={() => setActiveTab("schedule")}
              >
                Schedule
              </Button>
              <Button 
                variant={activeTab === "notes" ? "default" : "ghost"}
                onClick={() => setActiveTab("notes")}
              >
                <FileText className="w-4 h-4 mr-2" />
                Notes
              </Button>
              <Button 
                variant={activeTab === "quiz" ? "default" : "ghost"}
                onClick={() => setActiveTab("quiz")}
              >
                <Brain className="w-4 h-4 mr-2" />
                Quiz
              </Button>
              <Button 
                variant={activeTab === "midterms" ? "default" : "ghost"}
                onClick={() => setActiveTab("midterms")}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Midterms
              </Button>
              </nav>
              <Button 
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="ml-2"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {activeTab === "dashboard" && selectedCourseId === null && (
          <>
            {/* Welcome Banner */}
            <div className="mb-8 rounded-2xl backdrop-blur-md bg-background/20 border border-white/20 p-8 shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary-glow/20" />
              <div className="relative">
                <h1 className="text-3xl font-bold text-foreground mb-2" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                  Welcome back! 🎯
                </h1>
                <p className="text-foreground/90 text-lg" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                  Your personalized learning system is ready. {todayTasks.length > 0 ? `You have ${todayTasks.length} tasks optimized for today.` : "You're all caught up!"}
                </p>
              </div>
            </div>

            {/* Inspirational Quote */}
            <div className="mb-8">
              <InspirationalQuote />
            </div>

            {/* Course Star System */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Your Course Universe</h2>
              <CourseStarSystem 
                courses={courses.map(c => ({
                  ...c,
                  assignmentCount: assignments.filter(a => a.course === c.name).length
                }))}
                onCourseClick={(id, name) => {
                  setSelectedCourseId(id);
                  setSelectedCourseName(name);
                }}
              />
            </div>

            {/* Urgent Assignments - Due Within 2 Days */}
            {(() => {
              const now = new Date();
              const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
              const urgentAssignments = assignments.filter(a => {
                if (a.submitted) return false;
                const dueDate = new Date(a.dueDate);
                return dueDate <= twoDaysFromNow && dueDate >= now;
              });

              if (urgentAssignments.length === 0) return null;

              return (
                <div className="mb-8 backdrop-blur-md bg-destructive/10 border border-destructive/30 p-6 rounded-xl shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-6 h-6 text-destructive" style={{ filter: 'drop-shadow(0 0 4px hsl(var(--destructive) / 0.5))' }} />
                    <h2 className="text-2xl font-bold text-foreground">Urgent - Due Within 2 Days</h2>
                  </div>
                  <div className="space-y-3">
                    {urgentAssignments.map(assignment => {
                      const dueDate = new Date(assignment.dueDate);
                      const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
                      const daysUntilDue = Math.floor(hoursUntilDue / 24);
                      
                      let dueDateText = '';
                      if (hoursUntilDue < 24) {
                        dueDateText = 'Due today';
                      } else if (daysUntilDue === 1) {
                        dueDateText = 'Due tomorrow';
                      } else {
                        dueDateText = `Due in ${daysUntilDue} days`;
                      }

                      return (
                        <div key={assignment.id} className="p-4 rounded-lg backdrop-blur-sm bg-background/40 border border-white/20">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground mb-1">{assignment.title}</h3>
                              <p className="text-sm text-foreground/70 mb-2">{assignment.course}</p>
                              <div className="flex items-center gap-3 text-sm">
                                <span className="text-destructive font-medium">{dueDateText}</span>
                                {assignment.points && (
                                  <span className="text-foreground/70">{assignment.points} pts</span>
                                )}
                                <Badge variant="outline" className="text-xs">{assignment.type}</Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Schedule */}
          <div className="lg:col-span-2">
            <div className="backdrop-blur-md bg-background/20 border border-white/20 p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                  <Calendar className="w-6 h-6 text-primary" style={{ filter: 'drop-shadow(0 0 4px hsl(var(--primary) / 0.5))' }} />
                  Today's Canvas Assignments
                </h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={fetchCanvasAssignments}
                  disabled={isLoading}
                  className="backdrop-blur-sm bg-background/30 border-white/10 hover:bg-background/40"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Sync Canvas
                </Button>
              </div>

              {todayTasks.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" style={{ filter: 'drop-shadow(0 0 4px hsl(var(--muted) / 0.5))' }} />
                  <p className="text-foreground" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                    No assignments due today. Great work staying ahead!
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl backdrop-blur-sm border transition-all cursor-pointer ${
                      task.submitted 
                        ? 'bg-success/10 border-success/30 opacity-75' 
                        : 'bg-background/30 border-white/10 hover:bg-background/40'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-5 h-5 text-primary" style={{ filter: 'drop-shadow(0 0 4px hsl(var(--primary) / 0.5))' }} />
                          <div>
                            <h3 className="font-semibold text-foreground" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{task.title}</h3>
                            {task.course && (
                              <p className="text-xs text-foreground/80" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{task.courseCode || task.course}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm flex-wrap">
                          {task.submitted ? (
                            <Badge variant="default" className="bg-success text-success-foreground">
                              ✓ Complete
                            </Badge>
                          ) : (
                            <>
                              <Badge variant="outline" className="capitalize backdrop-blur-sm bg-background/20">
                                {task.type}
                              </Badge>
                              <span className="text-foreground/80 flex items-center gap-1" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                                <Clock className="w-3 h-3" />
                                {task.estimatedTime}
                              </span>
                              <Badge
                                variant={task.priority === "high" ? "destructive" : task.priority === "medium" ? "default" : "secondary"}
                              >
                                {task.priority}
                              </Badge>
                            </>
                          )}
                          {task.points && (
                            <span className="text-xs text-foreground/80" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                              {task.points} pts
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="pl-7">
                      {!task.submitted && (
                        <>
                          <div className="flex items-center gap-2 text-sm mb-2">
                            <Brain className="w-4 h-4 text-primary" style={{ filter: 'drop-shadow(0 0 4px hsl(var(--primary) / 0.5))' }} />
                            <span className="text-foreground/80" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>AI Recommends:</span>
                            <span className="font-medium text-primary" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{task.method}</span>
                          </div>
                        </>
                      )}
                      {task.dueDate && (
                        <p className="text-xs text-foreground/80" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                          {task.submitted ? 'Submitted' : `Due: ${new Date(task.dueDate).toLocaleString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-xl backdrop-blur-sm bg-accent/20 border border-accent/30">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" style={{ filter: 'drop-shadow(0 0 4px hsl(var(--accent) / 0.5))' }} />
                  <div>
                    <p className="font-medium text-foreground mb-1" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                      Cognitive Load Balanced
                    </p>
                    <p className="text-sm text-foreground/80" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                      Your schedule alternates between high and low intensity tasks to maintain optimal focus throughout the day.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
        </>
        )}

        {activeTab === "dashboard" && selectedCourseId !== null && (
          <CourseDetailView 
            courseId={selectedCourseId}
            courseName={selectedCourseName}
            onBack={() => {
              setSelectedCourseId(null);
              setSelectedCourseName("");
            }}
          />
        )}

        {activeTab === "schedule" && (
          <div className="space-y-6">
            <ScheduleView assignments={assignments} scheduleEvents={scheduleEvents} />
            <ClubActivityManager />
          </div>
        )}

        {activeTab === "notes" && (
          <NotesGenerator assignments={assignments} />
        )}

        {activeTab === "quiz" && (
          <QuizView courses={courses} />
        )}

        {activeTab === "midterms" && (
          <MidtermsView assignments={assignments} />
        )}
      </main>
      </div>
    </div>
  );
};

export default Index;
