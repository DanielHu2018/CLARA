import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";

const QUOTES = [
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Your limitation—it's only your imagination.", author: "Unknown" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
  { text: "Success doesn't just find you. You have to go out and get it.", author: "Unknown" },
  { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
  { text: "Dream it. Wish it. Do it.", author: "Unknown" },
  { text: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
  { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
  { text: "Little things make big days.", author: "Unknown" },
  { text: "It's going to be hard, but hard does not mean impossible.", author: "Unknown" },
  { text: "Don't wait for opportunity. Create it.", author: "Unknown" },
  { text: "Sometimes we're tested not to show our weaknesses, but to discover our strengths.", author: "Unknown" },
];

export function InspirationalQuote() {
  const [currentQuote, setCurrentQuote] = useState(() => {
    // Get quote based on current hour
    const hour = new Date().getHours();
    const quoteIndex = Math.floor(hour / 3) % QUOTES.length;
    return QUOTES[quoteIndex];
  });

  useEffect(() => {
    // Update quote every 3 hours
    const interval = setInterval(() => {
      const hour = new Date().getHours();
      const quoteIndex = Math.floor(hour / 3) % QUOTES.length;
      setCurrentQuote(QUOTES[quoteIndex]);
    }, 3 * 60 * 60 * 1000); // 3 hours in milliseconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="backdrop-blur-md bg-background/20 border border-white/20 rounded-lg p-6 shadow-lg">
      <div className="flex items-start gap-3">
        <Sparkles className="h-6 w-6 text-primary flex-shrink-0 mt-1" style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.5))' }} />
        <div className="flex-1">
          <p className="text-lg font-medium mb-2 text-foreground" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            "{currentQuote.text}"
          </p>
          <p className="text-sm text-muted-foreground" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
            — {currentQuote.author}
          </p>
        </div>
      </div>
    </div>
  );
}