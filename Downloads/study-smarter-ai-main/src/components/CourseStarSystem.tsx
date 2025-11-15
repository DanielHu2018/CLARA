import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Star, Target, Sparkles } from "lucide-react";

interface Course {
  id: number;
  name: string;
  courseCode: string;
  assignmentCount?: number;
}

interface CourseStarSystemProps {
  courses: Course[];
  onCourseClick: (courseId: number, courseName: string) => void;
}

const CourseStarSystem = ({ courses, onCourseClick }: CourseStarSystemProps) => {
  const getStarPosition = (index: number, total: number) => {
    const radius = 38;
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);
    return { x: `${x}%`, y: `${y}%` };
  };

  const colors = [
    { from: 'from-blue-500', to: 'to-purple-600', glow: 'shadow-[0_0_30px_rgba(147,51,234,0.5)]' },
    { from: 'from-green-500', to: 'to-teal-600', glow: 'shadow-[0_0_30px_rgba(20,184,166,0.5)]' },
    { from: 'from-orange-500', to: 'to-red-600', glow: 'shadow-[0_0_30px_rgba(239,68,68,0.5)]' },
    { from: 'from-pink-500', to: 'to-rose-600', glow: 'shadow-[0_0_30px_rgba(244,63,94,0.5)]' },
    { from: 'from-indigo-500', to: 'to-blue-600', glow: 'shadow-[0_0_30px_rgba(59,130,246,0.5)]' },
    { from: 'from-yellow-500', to: 'to-orange-600', glow: 'shadow-[0_0_30px_rgba(249,115,22,0.5)]' },
    { from: 'from-cyan-500', to: 'to-blue-600', glow: 'shadow-[0_0_30px_rgba(6,182,212,0.5)]' },
  ];

  return (
    <div className="relative w-full rounded-3xl bg-gradient-to-br from-secondary/20 via-background/40 to-secondary/30 border-2 border-border/50 overflow-hidden backdrop-blur-sm" style={{ height: '650px' }}>
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-grid animate-drift" />
      </div>

      <div className="absolute top-10 left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 right-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
        <div className="relative group">
          <div className="absolute inset-0 -m-4 rounded-full border-2 border-primary/30 animate-spin" style={{ animationDuration: '20s' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-primary rounded-full" />
          </div>
          
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary via-primary to-accent shadow-[0_0_60px_rgba(var(--primary-rgb),0.8)] flex items-center justify-center relative overflow-hidden group-hover:scale-110 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Star className="w-16 h-16 text-primary-foreground animate-pulse drop-shadow-lg" fill="currentColor" />
          </div>
        </div>
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <p className="text-center font-bold text-lg text-foreground drop-shadow-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Your Courses
            <Sparkles className="w-5 h-5 text-primary" />
          </p>
        </div>
      </div>

      {courses.map((course, index) => {
        const position = getStarPosition(index, courses.length);
        const colorSet = colors[index % colors.length];
        
        const centerX = 50;
        const centerY = 50;
        const starX = parseFloat(position.x);
        const starY = parseFloat(position.y);
        const angle = Math.atan2(starY - centerY, starX - centerX);
        const distance = Math.sqrt(Math.pow(starX - centerX, 2) + Math.pow(starY - centerY, 2));
        
        return (
          <div
            key={course.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10"
            style={{ left: position.x, top: position.y }}
            onClick={() => onCourseClick(course.id, course.name)}
          >
            <svg
              className="absolute top-1/2 left-1/2 pointer-events-none -z-10"
              style={{
                width: `${distance * 6}px`,
                height: '2px',
                transformOrigin: 'left center',
                transform: `rotate(${angle}rad) translateY(-50%)`
              }}
            >
              <line
                x1="0"
                y1="0"
                x2="100%"
                y2="0"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="5,5"
                className="text-border/50 group-hover:text-primary/60 transition-colors duration-500"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="10"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </line>
            </svg>
            
            <div className="absolute inset-0 -m-8 rounded-full border border-primary/0 group-hover:border-primary/40 transition-all duration-500 group-hover:animate-spin" style={{ animationDuration: '15s' }} />
            
            <Card className="w-44 bg-card/95 backdrop-blur-md hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] transition-all duration-500 hover:scale-110 hover:z-30 border-2 border-border/50 hover:border-primary/50 relative overflow-hidden group-hover:-translate-y-2">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              
              <div className="p-4 relative z-10">
                <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${colorSet.from} ${colorSet.to} ${colorSet.glow} mx-auto mb-3 flex items-center justify-center shadow-lg group-hover:shadow-2xl transition-all duration-500 relative`}>
                  <BookOpen className="w-7 h-7 text-white drop-shadow-lg" />
                  <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping opacity-0 group-hover:opacity-100" />
                </div>
                
                <h3 className="font-bold text-sm text-center text-foreground mb-2 line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors">
                  {course.courseCode || course.name}
                </h3>
                
                {course.assignmentCount !== undefined && (
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-2">
                    <Target className="w-3 h-3" />
                    <span className="font-medium">{course.assignmentCount} tasks</span>
                  </div>
                )}
                
                <Badge variant="secondary" className="w-full justify-center text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Explore
                </Badge>
              </div>
            </Card>

            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-primary rounded-full animate-float"
                  style={{
                    left: '50%',
                    top: '50%',
                    animationDelay: `${i * 0.2}s`,
                    animationDuration: '2s'
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}

      <div className="absolute inset-0 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full animate-twinkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default CourseStarSystem;
