import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Brain, Target, BookOpen } from "lucide-react";

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
  submitted?: boolean;
}

interface InsightsViewProps {
  assignments: Assignment[];
}

const InsightsView = ({ assignments }: InsightsViewProps) => {
  // Group assignments by course
  const courseGroups = assignments.reduce((acc, assignment) => {
    const courseName = assignment.course || 'Unknown Course';
    if (!acc[courseName]) {
      acc[courseName] = [];
    }
    acc[courseName].push(assignment);
    return acc;
  }, {} as Record<string, Assignment[]>);

  // Calculate insights for each course
  const calculateCourseInsights = (courseAssignments: Assignment[]) => {
    const typeCount: Record<string, number> = {};
    let totalPoints = 0;
    let highPriorityCount = 0;
    let unsubmittedCount = 0;

    courseAssignments.forEach(a => {
      typeCount[a.type] = (typeCount[a.type] || 0) + 1;
      if (a.points) totalPoints += a.points;
      
      // Only count unsubmitted assignments as high priority
      if (a.priority === 'high' && !a.submitted) {
        highPriorityCount++;
      }
      
      if (!a.submitted) {
        unsubmittedCount++;
      }
    });

    return {
      totalAssignments: courseAssignments.length,
      unsubmittedCount,
      totalPoints,
      highPriorityCount,
      typeDistribution: typeCount,
    };
  };

  return (
    <div className="space-y-6">
      <div className="backdrop-blur-md bg-background/20 border border-white/20 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
          <TrendingUp className="w-6 h-6 text-primary" style={{ filter: 'drop-shadow(0 0 4px hsl(var(--primary) / 0.5))' }} />
          Learning Insights by Course
        </h2>
      </div>

      {Object.entries(courseGroups).length === 0 ? (
        <div className="backdrop-blur-md bg-background/20 border border-white/20 p-12 rounded-lg shadow-lg text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-foreground/70" style={{ filter: 'drop-shadow(0 0 4px hsl(var(--foreground) / 0.3))' }} />
          <p className="text-foreground" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
            No assignments yet. Sync with Canvas to see insights.
          </p>
        </div>
      ) : (
        Object.entries(courseGroups).map(([courseName, courseAssignments]) => {
          const courseInsights = calculateCourseInsights(courseAssignments);
          
          return (
            <div key={courseName} className="backdrop-blur-md bg-background/20 border border-white/20 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-bold text-foreground mb-4" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                {courseName}
              </h3>

              {/* Course Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="backdrop-blur-sm bg-background/30 border border-white/10 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl backdrop-blur-sm bg-primary/20">
                      <BookOpen className="w-5 h-5 text-primary" style={{ filter: 'drop-shadow(0 0 4px hsl(var(--primary) / 0.5))' }} />
                    </div>
                    <div>
                      <p className="text-sm text-foreground/80" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>Unsubmitted</p>
                      <p className="text-2xl font-bold text-foreground" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{courseInsights.unsubmittedCount}</p>
                      <p className="text-xs text-foreground/60" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>of {courseInsights.totalAssignments} total</p>
                    </div>
                  </div>
                </div>

                <div className="backdrop-blur-sm bg-background/30 border border-white/10 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl backdrop-blur-sm bg-accent/20">
                      <Target className="w-5 h-5 text-accent" style={{ filter: 'drop-shadow(0 0 4px hsl(var(--accent) / 0.5))' }} />
                    </div>
                    <div>
                      <p className="text-sm text-foreground/80" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>Total Points</p>
                      <p className="text-2xl font-bold text-foreground" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{courseInsights.totalPoints}</p>
                    </div>
                  </div>
                </div>

                <div className="backdrop-blur-sm bg-background/30 border border-white/10 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl backdrop-blur-sm bg-destructive/20">
                      <TrendingUp className="w-5 h-5 text-destructive" style={{ filter: 'drop-shadow(0 0 4px hsl(var(--destructive) / 0.5))' }} />
                    </div>
                    <div>
                      <p className="text-sm text-foreground/80" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>Urgent</p>
                      <p className="text-2xl font-bold text-foreground" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{courseInsights.highPriorityCount}</p>
                      <p className="text-xs text-foreground/60" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>due within 2 days</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assignment Type Distribution */}
              <div className="backdrop-blur-sm bg-background/30 border border-white/10 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                  <Brain className="w-5 h-5 text-primary" style={{ filter: 'drop-shadow(0 0 4px hsl(var(--primary) / 0.5))' }} />
                  Assignment Type Distribution
                </h4>
                <div className="space-y-4">
                  {Object.entries(courseInsights.typeDistribution).map(([type, count]) => {
                    const percentage = (count / courseInsights.totalAssignments) * 100;
                    return (
                      <div key={type}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-foreground capitalize" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{type}</span>
                          <span className="text-foreground/80" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{count} assignment{count !== 1 ? 's' : ''} ({percentage.toFixed(0)}%)</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Course-specific Insights */}
              {courseInsights.highPriorityCount > 0 && (
                <div className="mt-4 backdrop-blur-sm bg-destructive/20 border border-destructive/30 p-4 rounded-lg">
                  <div className="flex items-start gap-3 mb-4">
                    <Badge variant="destructive" className="mt-0.5">⚠️</Badge>
                    <div>
                      <p className="text-sm font-medium text-foreground" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>Urgent Attention Needed</p>
                      <p className="text-sm text-foreground/80" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                        {courseInsights.highPriorityCount} unsubmitted assignment{courseInsights.highPriorityCount !== 1 ? 's' : ''} due within 2 days or worth 100+ points
                      </p>
                    </div>
                  </div>
                  
                  {/* List urgent assignments */}
                  <div className="space-y-2 ml-10">
                    {courseAssignments
                      .filter(a => a.priority === 'high' && !a.submitted)
                      .map(assignment => {
                        const dueDate = new Date(assignment.dueDate);
                        const now = new Date();
                        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        
                        return (
                          <div key={assignment.id} className="backdrop-blur-sm bg-background/40 border border-destructive/20 p-3 rounded-lg">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                                  {assignment.title}
                                </p>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                  <span className="text-xs text-foreground/70" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                                    {daysUntilDue === 0 ? 'Due today' : daysUntilDue === 1 ? 'Due tomorrow' : `Due in ${daysUntilDue} days`}
                                  </span>
                                  {assignment.points && (
                                    <span className="text-xs text-foreground/70" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                                      {assignment.points} pts
                                    </span>
                                  )}
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {assignment.type}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default InsightsView;
