import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Activity {
  id: string;
  title: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location?: string;
  activity_type: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const ClubActivityManager = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    day_of_week: "1",
    start_time: "",
    end_time: "",
    location: "",
    activity_type: "club"
  });

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', user.id)
      .order('day_of_week', { ascending: true });

    if (error) {
      console.error('Error fetching activities:', error);
      return;
    }

    setActivities(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add activities",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    const { error } = await supabase
      .from('user_activities')
      .insert([{
        user_id: user.id,
        title: formData.title,
        day_of_week: parseInt(formData.day_of_week),
        start_time: formData.start_time,
        end_time: formData.end_time,
        location: formData.location || null,
        activity_type: formData.activity_type
      }]);

    if (error) {
      console.error('Error adding activity:', error);
      toast({
        title: "Error",
        description: "Failed to add activity",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Activity added successfully"
      });
      setFormData({
        title: "",
        day_of_week: "1",
        start_time: "",
        end_time: "",
        location: "",
        activity_type: "club"
      });
      setIsOpen(false);
      fetchActivities();
    }

    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('user_activities')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting activity:', error);
      toast({
        title: "Error",
        description: "Failed to delete activity",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Activity deleted"
      });
      fetchActivities();
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary" />
          Club Activities & Classes
        </h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Activity
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Club or Activity</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Activity Name</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Chess Club"
                  required
                />
              </div>

              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.activity_type}
                  onValueChange={(value) => setFormData({ ...formData, activity_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="club">Club</SelectItem>
                    <SelectItem value="sport">Sport</SelectItem>
                    <SelectItem value="volunteer">Volunteer</SelectItem>
                    <SelectItem value="work">Work</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="day">Day of Week</Label>
                <Select
                  value={formData.day_of_week}
                  onValueChange={(value) => setFormData({ ...formData, day_of_week: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day, idx) => (
                      <SelectItem key={idx} value={idx.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start">Start Time</Label>
                  <Input
                    id="start"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end">End Time</Label>
                  <Input
                    id="end"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="location">Location (Optional)</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Student Union Room 301"
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Adding..." : "Add Activity"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {activities.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No activities added yet. Click "Add Activity" to get started.
          </p>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="p-3 rounded-lg bg-secondary/50 border border-border flex items-start justify-between"
            >
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">{activity.title}</h4>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline">{DAYS[activity.day_of_week] || 'N/A'}</Badge>
                  {activity.start_time && activity.end_time && (
                    <span className="text-sm text-muted-foreground">
                      {activity.start_time.slice(0, 5)} - {activity.end_time.slice(0, 5)}
                    </span>
                  )}
                  {activity.location && (
                    <span className="text-xs text-muted-foreground">
                      📍 {activity.location}
                    </span>
                  )}
                  <Badge variant="secondary" className="capitalize">
                    {activity.activity_type || 'activity'}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(activity.id)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};