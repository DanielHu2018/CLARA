import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ClassScheduleInputProps {
  userId: string;
  onScheduleAdded: () => void;
  courses: any[];
}

interface ClassTime {
  courseId: string;
  startTime: string;
  endTime: string;
  location: string;
  selectedDays: number[];
}

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
];

export function ClassScheduleInput({ userId, onScheduleAdded, courses }: ClassScheduleInputProps) {
  const [open, setOpen] = useState(false);
  const [classes, setClasses] = useState<ClassTime[]>([{
    courseId: "",
    startTime: "",
    endTime: "",
    location: "",
    selectedDays: []
  }]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const addClass = () => {
    setClasses([...classes, {
      courseId: "",
      startTime: "",
      endTime: "",
      location: "",
      selectedDays: []
    }]);
  };

  const removeClass = (index: number) => {
    setClasses(classes.filter((_, i) => i !== index));
  };

  const updateClass = (index: number, field: keyof ClassTime, value: string | number | number[]) => {
    const updated = [...classes];
    updated[index] = { ...updated[index], [field]: value };
    setClasses(updated);
  };

  const toggleDay = (classIndex: number, day: number) => {
    const updated = [...classes];
    const selectedDays = updated[classIndex].selectedDays;
    if (selectedDays.includes(day)) {
      updated[classIndex].selectedDays = selectedDays.filter(d => d !== day);
    } else {
      updated[classIndex].selectedDays = [...selectedDays, day];
    }
    setClasses(updated);
  };

  const handleSave = async () => {
    const validClasses = classes.filter(c => c.courseId && c.startTime && c.endTime && c.selectedDays.length > 0);
    
    if (validClasses.length === 0) {
      toast({
        title: "No classes to save",
        description: "Please fill in course, times, and select at least one day",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      // Create one entry per selected day for each class
      const entries = validClasses.flatMap(c => {
        const course = courses.find(course => course.id.toString() === c.courseId);
        const courseName = course ? `${course.course_code || course.name}` : 'Class';
        
        return c.selectedDays.map(day => ({
          user_id: userId,
          title: courseName,
          day_of_week: day,
          start_time: c.startTime,
          end_time: c.endTime,
          location: c.location || null,
          activity_type: 'class'
        }));
      });

      const { error } = await supabase
        .from('user_activities')
        .insert(entries);

      if (error) throw error;

      toast({
        title: "Schedule saved!",
        description: `Added ${entries.length} class time(s) to your schedule`
      });

      setOpen(false);
      setClasses([{
        courseId: "",
        startTime: "",
        endTime: "",
        location: "",
        selectedDays: []
      }]);
      onScheduleAdded();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast({
        title: "Error saving schedule",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="backdrop-blur-sm bg-background/30 border-white/20 text-foreground hover:bg-background/40">
          Add Class Schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Your Class Schedule</DialogTitle>
          <DialogDescription>
            Enter your class times and they'll appear on your calendar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {classes.map((classItem, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3 relative">
              {classes.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => removeClass(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}

              <div className="space-y-3">
                <div>
                  <Label>Course</Label>
                  <Select
                    value={classItem.courseId}
                    onValueChange={(value) => updateClass(index, 'courseId', value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id.toString()}>
                          {course.course_code} - {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Days (select multiple)</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {DAYS.map(day => (
                      <Button
                        key={day.value}
                        type="button"
                        variant={classItem.selectedDays.includes(day.value) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleDay(index, day.value)}
                        className="flex-1 min-w-[70px]"
                      >
                        {day.label.substring(0, 3)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={classItem.startTime}
                      onChange={(e) => updateClass(index, 'startTime', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={classItem.endTime}
                      onChange={(e) => updateClass(index, 'endTime', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Location (optional)</Label>
                  <Input
                    placeholder="e.g., Room 201"
                    value={classItem.location}
                    onChange={(e) => updateClass(index, 'location', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={addClass}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Class
          </Button>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Schedule"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}