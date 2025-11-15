import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, Check, Loader2, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BackgroundOption {
  id: string;
  name: string;
  preview: string;
  gradient: string;
}

const presetBackgrounds: BackgroundOption[] = [
  {
    id: "cosmic",
    name: "Cosmic Night",
    preview: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  },
  {
    id: "ocean",
    name: "Ocean Depths",
    preview: "linear-gradient(135deg, #2E3192 0%, #1BFFFF 100%)",
    gradient: "linear-gradient(135deg, #2E3192 0%, #1BFFFF 100%)"
  },
  {
    id: "sunset",
    name: "Sunset Glow",
    preview: "linear-gradient(135deg, #FF512F 0%, #F09819 100%)",
    gradient: "linear-gradient(135deg, #FF512F 0%, #F09819 100%)"
  },
  {
    id: "forest",
    name: "Forest Mist",
    preview: "linear-gradient(135deg, #134E5E 0%, #71B280 100%)",
    gradient: "linear-gradient(135deg, #134E5E 0%, #71B280 100%)"
  },
  {
    id: "aurora",
    name: "Aurora Borealis",
    preview: "linear-gradient(135deg, #00d2ff 0%, #3a47d5 100%)",
    gradient: "linear-gradient(135deg, #00d2ff 0%, #3a47d5 100%)"
  },
  {
    id: "lavender",
    name: "Lavender Dream",
    preview: "linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)",
    gradient: "linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)"
  }
];

interface BackgroundSelectorProps {
  currentBackground: string;
  onBackgroundChange: (background: string) => void;
}

export const BackgroundSelector = ({ currentBackground, onBackgroundChange }: BackgroundSelectorProps) => {
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSelectPreset = (background: BackgroundOption) => {
    onBackgroundChange(background.gradient);
    setOpen(false);
    toast({
      title: "Background Updated",
      description: `Applied ${background.name}`,
    });
  };

  const handleGenerateCustom = async () => {
    if (!customPrompt.trim()) {
      toast({
        title: "Enter a prompt",
        description: "Please describe your desired background",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-background', {
        body: { prompt: customPrompt }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        onBackgroundChange(`url('${data.imageUrl}')`);
        setOpen(false);
        toast({
          title: "Custom Background Created!",
          description: "Your AI-generated background has been applied",
        });
        setCustomPrompt("");
      }
    } catch (error) {
      console.error('Error generating background:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate custom background. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Palette className="w-4 h-4" />
          Customize Background
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Choose Your Dashboard Background
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preset Backgrounds */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Preset Themes</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {presetBackgrounds.map((bg) => (
                <Card
                  key={bg.id}
                  className="relative cursor-pointer hover:scale-105 transition-transform overflow-hidden group"
                  onClick={() => handleSelectPreset(bg)}
                >
                  <div
                    className="h-24 w-full"
                    style={{ background: bg.preview }}
                  />
                  <div className="p-2 bg-background/95 backdrop-blur">
                    <p className="text-xs font-medium text-center">{bg.name}</p>
                  </div>
                  {currentBackground === bg.gradient && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* AI Generator */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Custom Background
            </h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="prompt">Describe your ideal background</Label>
                <Input
                  id="prompt"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g., Peaceful mountain landscape at dawn, soft purple sky..."
                  className="mt-2"
                  disabled={isGenerating}
                />
              </div>
              <Button
                onClick={handleGenerateCustom}
                disabled={isGenerating || !customPrompt.trim()}
                className="w-full gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Background
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
