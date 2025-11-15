import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Brain, Calendar, BookOpen, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

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
  method?: string;
}

interface ScheduleEvent {
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  location?: string;
}

interface StudyBlock {
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  task: string;
  method: string;
  priority: string;
  reason?: string;
}

interface ScheduleViewProps {
  assignments: Assignment[];
  scheduleEvents: ScheduleEvent[];
}

interface CalendarEvent {
  type: 'class' | 'club' | 'study' | 'assignment';
  title: string;
  startTime: Date;
  endTime: Date;
  startHour: number;
  duration: number;
  course?: string;
  location?: string;
  method?: string;
  priority?: string;
  reason?: string;
  activityType?: string;
}

const ScheduleView = ({ assignments, scheduleEvents }: ScheduleViewProps) => {
  const [studyBlocks, setStudyBlocks] = useState<StudyBlock[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [clubActivities, setClubActivities] = useState<any[]>([]);
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchClubActivities();
  }, []);

  const fetchClubActivities = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', user.id);

    setClubActivities(data || []);
  };

  const generateStudySchedule = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-study-schedule', {
        body: {
          classSchedule: scheduleEvents,
          clubActivities: clubActivities,
          assignments: assignments,
          examDates: []
        }
      });

      if (error) throw error;

      console.log('Study schedule response:', data);

      if (data?.schedule && Array.isArray(data.schedule) && data.schedule.length > 0) {
        console.log('Received study blocks:', data.schedule);
        console.log('First block:', data.schedule[0]);
        setStudyBlocks(data.schedule);
        toast({
          title: "Study Schedule Generated!",
          description: `Created ${data.schedule.length} optimized study blocks`,
        });
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        console.error('No schedule in response:', data);
        throw new Error('No study blocks were generated. Please try again.');
      }
    } catch (error: any) {
      console.error('Error generating study schedule:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate study schedule",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const timeSlots = Array.from({ length: 15 }, (_, i) => i + 7);

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const weekDays = getWeekDays();

  const parseTimeToHours = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes || 0) / 60;
  };

  const getEventsForDay = (day: Date): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    const dayStr = day.toISOString().split('T')[0];

    scheduleEvents.forEach(event => {
      const eventDate = new Date(event.startTime);
      if (
        eventDate.getDate() === day.getDate() &&
        eventDate.getMonth() === day.getMonth() &&
        eventDate.getFullYear() === day.getFullYear()
      ) {
        const start = new Date(event.startTime);
        const end = new Date(event.endTime);
        events.push({
          type: 'class',
          title: event.title,
          startTime: start,
          endTime: end,
          startHour: start.getHours() + start.getMinutes() / 60,
          duration: (end.getTime() - start.getTime()) / (1000 * 60 * 60),
          location: event.location
        });
      }
    });

    clubActivities.forEach(club => {
      if (club.day_of_week === day.getDay()) {
        const startHour = parseTimeToHours(club.start_time);
        const endHour = parseTimeToHours(club.end_time);
        
        const startTime = new Date(day);
        startTime.setHours(Math.floor(startHour), (startHour % 1) * 60);
        
        const endTime = new Date(day);
        endTime.setHours(Math.floor(endHour), (endHour % 1) * 60);

        events.push({
          type: club.activity_type === 'class' ? 'class' : 'club',
          title: club.title,
          startTime,
          endTime,
          startHour,
          duration: endHour - startHour,
          location: club.location,
          activityType: club.activity_type
        });
      }
    });

    studyBlocks.forEach(block => {
      // Ensure day format matches - convert both to YYYY-MM-DD
      const blockDay = block.day;
      const dayStr = day.toISOString().split('T')[0];
      
      // Handle both formats
      const blockDayFormatted = blockDay.includes('T') 
        ? blockDay.split('T')[0] 
        : blockDay;
      
      // Normalize dates - handle timezone issues
      const blockDate = new Date(blockDayFormatted + 'T00:00:00');
      const currentDate = new Date(dayStr + 'T00:00:00');
      
      // Compare dates (ignore time)
      const isSameDay = blockDate.getTime() === currentDate.getTime() ||
                       blockDayFormatted === dayStr;
      
      if (isSameDay) {
        const startHour = parseTimeToHours(block.startTime);
        const endHour = parseTimeToHours(block.endTime);
        
        // Skip if start time is before 9am
        if (startHour < 9) {
          console.warn(`Skipping block before 9am: ${block.subject} at ${block.startTime}`);
          return;
        }
        
        // Check for conflicts with classes
        let hasConflict = false;
        scheduleEvents.forEach(event => {
          const eventDate = new Date(event.startTime);
          if (
            eventDate.getDate() === day.getDate() &&
            eventDate.getMonth() === day.getMonth() &&
            eventDate.getFullYear() === day.getFullYear()
          ) {
            const eventStart = eventDate.getHours() + eventDate.getMinutes() / 60;
            const eventEnd = new Date(event.endTime).getHours() + new Date(event.endTime).getMinutes() / 60;
            
            // Check for overlap
            if (startHour < eventEnd && endHour > eventStart) {
              hasConflict = true;
            }
          }
        });
        
        // Check for conflicts with club activities
        clubActivities.forEach(club => {
          if (club.day_of_week === day.getDay()) {
            const clubStart = parseTimeToHours(club.start_time);
            const clubEnd = parseTimeToHours(club.end_time);
            
            if (startHour < clubEnd && endHour > clubStart) {
              hasConflict = true;
            }
          }
        });
        
        // Skip if there's a conflict
        if (hasConflict) {
          console.warn(`Skipping conflicting block: ${block.subject} at ${block.startTime}-${block.endTime}`);
          return;
        }
        
        const startTime = new Date(day);
        startTime.setHours(Math.floor(startHour), (startHour % 1) * 60);
        
        const endTime = new Date(day);
        endTime.setHours(Math.floor(endHour), (endHour % 1) * 60);

        events.push({
          type: 'study',
          title: block.subject,
          startTime,
          endTime,
          startHour,
          duration: endHour - startHour,
          method: block.method,
          priority: block.priority,
          reason: block.reason
        });
      }
    });

    assignments.forEach(assignment => {
      const assignmentDate = new Date(assignment.dueDate);
      if (
        assignmentDate.getDate() === day.getDate() &&
        assignmentDate.getMonth() === day.getMonth() &&
        assignmentDate.getFullYear() === day.getFullYear()
      ) {
        const hour = assignmentDate.getHours() + assignmentDate.getMinutes() / 60;
        events.push({
          type: 'assignment',
          title: assignment.title,
          startTime: assignmentDate,
          endTime: assignmentDate,
          startHour: hour,
          duration: 0.5,
          course: assignment.courseCode || assignment.course,
          priority: assignment.priority,
          method: assignment.method
        });
      }
    });

    return events.sort((a, b) => a.startHour - b.startHour);
  };

  const calculateEventLayout = (events: CalendarEvent[], currentEvent: CalendarEvent, eventIdx: number) => {
    // Find overlapping events
    const overlapping = events.filter(e => {
      const eEnd = e.startHour + e.duration;
      const currentEnd = currentEvent.startHour + currentEvent.duration;
      return (e.startHour < currentEnd && eEnd > currentEvent.startHour);
    });

    const totalOverlapping = overlapping.length;
    const currentIndex = overlapping.indexOf(currentEvent);

    // Calculate width and position
    const widthPercent = 100 / totalOverlapping;
    const leftPercent = widthPercent * currentIndex;

    return {
      width: `${widthPercent - 2}%`,
      left: `${leftPercent + 1}%`
    };
  };

  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour} ${ampm}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() + (direction === 'next' ? 7 : -7));
    setWeekStart(newStart);
  };

  return (
    <div className="space-y-6">
      {/* Header with Week Navigation */}
      <div className="backdrop-blur-md bg-background/20 border border-white/20 p-6 rounded-2xl shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground flex items-center gap-3 mb-2">
              <Calendar className="w-8 h-8 text-primary" />
              Weekly Calendar View
            </h2>
            <p className="text-foreground/80">
              Your complete schedule with classes, activities, and AI-optimized study time
            </p>
          </div>
          <Button 
            variant="default"
            size="lg"
            onClick={generateStudySchedule}
            disabled={isGenerating}
            className="whitespace-nowrap"
          >
            <Sparkles className={`w-5 h-5 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generating...' : 'Generate AI Study Plan'}
          </Button>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <span className="text-base font-semibold text-foreground px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
            {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <Card className="p-4 bg-muted/30">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary/20 border-2 border-primary/40"></div>
            <span className="text-foreground font-medium">Classes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-secondary/40 border-2 border-border"></div>
            <span className="text-foreground font-medium">Activities & Clubs</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-accent/30 border-2 border-accent"></div>
            <span className="text-foreground font-medium">AI Study Blocks</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-destructive/20 border-2 border-destructive/40"></div>
            <span className="text-foreground font-medium">Assignments Due</span>
          </div>
        </div>
      </Card>

      {/* Calendar Grid */}
      <Card className="overflow-hidden border-2 shadow-xl">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-8 border-b-2 border-border bg-gradient-to-r from-primary/5 to-primary/10">
              <div className="p-4 text-sm font-bold text-foreground">Time</div>
              {weekDays.map((day, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 text-center border-l-2 border-border ${isToday(day) ? 'bg-primary/10 border-l-primary' : ''}`}
                >
                  <div className="font-bold text-base text-foreground">
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className={`text-sm font-semibold mt-1 ${isToday(day) ? 'text-primary' : 'text-muted-foreground'}`}>
                    {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>

            {timeSlots.map(hour => (
              <div key={hour} className="grid grid-cols-8 border-b border-border min-h-[90px]">
                <div className="p-3 text-sm text-foreground font-semibold border-r-2 border-border bg-muted/20">
                  {formatHour(hour)}
                </div>
                {weekDays.map((day, dayIdx) => {
                  const events = getEventsForDay(day);
                  const hourEvents = events.filter(e => 
                    e.startHour >= hour && e.startHour < hour + 1
                  );

                  return (
                    <div 
                      key={dayIdx} 
                      className={`relative p-1 border-l-2 border-border ${isToday(day) ? 'bg-primary/5' : 'hover:bg-muted/10'} transition-colors`}
                    >
                      {hourEvents.map((event, eventIdx) => {
                        const topOffset = ((event.startHour - hour) * 100);
                        const height = Math.min(event.duration * 80, 76);
                        const layout = calculateEventLayout(events, event, eventIdx);

                        let bgColor = '';
                        let borderColor = '';
                        let icon = null;

                        if (event.type === 'class') {
                          bgColor = 'bg-primary/10';
                          borderColor = 'border-primary/40';
                          icon = <BookOpen className="w-3 h-3" />;
                        } else if (event.type === 'club') {
                          bgColor = 'bg-secondary/40';
                          borderColor = 'border-border';
                          icon = <Clock className="w-3 h-3" />;
                        } else if (event.type === 'study') {
                          bgColor = 'bg-accent/20';
                          borderColor = 'border-accent';
                          icon = <Sparkles className="w-3 h-3" />;
                        } else if (event.type === 'assignment') {
                          bgColor = 'bg-destructive/10';
                          borderColor = 'border-destructive/40';
                          icon = <Clock className="w-3 h-3" />;
                        }

                        return (
                          <div
                            key={eventIdx}
                            className={`absolute ${bgColor} border ${borderColor} rounded p-1 overflow-hidden text-xs`}
                            style={{
                              top: `${topOffset}%`,
                              height: `${height}px`,
                              left: layout.left,
                              width: layout.width,
                            }}
                            title={`${event.title}${event.location ? ` - ${event.location}` : ''}`}
                          >
                            <div className="flex items-start gap-1">
                              {icon}
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold truncate text-foreground">{event.title}</div>
                                {event.course && (
                                  <div className="text-xs text-muted-foreground truncate">{event.course}</div>
                                )}
                                {event.location && height > 40 && (
                                  <div className="text-xs text-muted-foreground truncate">📍 {event.location}</div>
                                )}
                                {event.method && height > 50 && (
                                  <div className="text-xs text-accent-foreground truncate mt-1">
                                    <Brain className="w-2 h-2 inline mr-1" />
                                    {event.method}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-r from-primary/5 to-accent/5 border-2 border-primary/20">
        <p className="text-base text-foreground">
          <strong className="text-primary">💡 Pro Tip:</strong> Click the <strong>"Generate AI Study Plan"</strong> button above to automatically create optimized study blocks that fit perfectly into your schedule. The AI considers your classes, activities, assignments, and available free time to maximize your productivity!
        </p>
      </Card>

      {/* Study Block Summary List */}
      {studyBlocks.length > 0 && (
        <Card className="overflow-hidden border-2 shadow-xl">
          <div className="bg-gradient-to-r from-accent/10 to-primary/10 p-6 border-b-2 border-border">
            <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary" />
              AI Study Plan Summary
            </h3>
            <p className="text-muted-foreground mt-1">
              Your personalized study schedule organized by class
            </p>
          </div>
          
          <div className="p-6">
            {/* Group study blocks by subject/class */}
            {(() => {
              const groupedByClass: Record<string, StudyBlock[]> = {};
              
              studyBlocks.forEach(block => {
                // Extract class name from subject (e.g., "Biology - Restriction Enzymes" -> "Biology")
                const className = block.subject.split(' - ')[0] || block.subject;
                if (!groupedByClass[className]) {
                  groupedByClass[className] = [];
                }
                groupedByClass[className].push(block);
              });

              return Object.entries(groupedByClass).map(([className, blocks]) => (
                <div key={className} className="mb-6 last:mb-0">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <h4 className="text-xl font-bold text-foreground">{className}</h4>
                    <Badge variant="secondary" className="ml-2">
                      {blocks.length} session{blocks.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3 ml-7">
                    {blocks.map((block, idx) => {
                      const dayDate = new Date(block.day);
                      const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
                      const monthDay = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      
                      return (
                        <div 
                          key={idx}
                          className="p-4 rounded-lg border-2 bg-background/50 backdrop-blur-sm border-accent/30 hover:border-accent/50 transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="font-semibold text-foreground">
                                  {dayName}, {monthDay}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {block.startTime} - {block.endTime}
                                </span>
                                <Badge 
                                  variant={
                                    block.priority === 'high' ? 'destructive' :
                                    block.priority === 'medium' ? 'default' : 'secondary'
                                  }
                                  className="ml-2"
                                >
                                  {block.priority}
                                </Badge>
                              </div>
                              
                              <div className="space-y-1.5">
                                <div>
                                  <span className="text-sm font-medium text-muted-foreground">What to study:</span>
                                  <p className="text-foreground font-medium mt-0.5">
                                    {block.subject.includes(' - ') 
                                      ? block.subject.split(' - ').slice(1).join(' - ')
                                      : block.subject
                                    }
                                  </p>
                                </div>
                                
                                {block.task && (
                                  <div>
                                    <span className="text-sm font-medium text-muted-foreground">Task:</span>
                                    <p className="text-foreground mt-0.5">{block.task}</p>
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-accent" />
                                    <span className="text-sm text-muted-foreground">Method:</span>
                                    <span className="text-sm font-medium text-foreground">{block.method}</span>
                                  </div>
                                  {block.reason && (
                                    <>
                                      <span className="text-muted-foreground">•</span>
                                      <span className="text-sm text-muted-foreground italic">{block.reason}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ScheduleView;
