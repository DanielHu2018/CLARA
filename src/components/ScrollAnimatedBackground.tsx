import { useEffect, useRef, useState } from 'react';

const TOTAL_FRAMES = 102;
const FRAME_START = 1; // Start from frame_001

export function ScrollAnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const currentFrameRef = useRef(0);
  const targetFrameRef = useRef(0);
  const rafRef = useRef<number>();

  // Preload all frames
  useEffect(() => {
    const images: HTMLImageElement[] = [];
    let loadedCount = 0;

    console.log('Starting to load frames...');

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      const frameNum = (i + FRAME_START).toString().padStart(3, '0');
      img.src = `/frames/frame_${frameNum}_delay-0.04s.jpg`;
      
      img.onload = () => {
        loadedCount++;
        if (loadedCount === TOTAL_FRAMES) {
          console.log('All frames loaded!');
          setImagesLoaded(true);
        }
      };

      img.onerror = (e) => {
        console.error(`Failed to load frame ${frameNum}:`, e);
      };
      
      images.push(img);
    }

    imagesRef.current = images;
  }, []);

  // Render frame on canvas
  const renderFrame = (frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('No canvas ref');
      return;
    }
    if (!imagesLoaded) {
      console.log('Images not loaded yet');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('No canvas context');
      return;
    }

    const index = Math.floor(frameIndex);
    const img = imagesRef.current[index];
    if (!img) {
      console.log('No image at index', index);
      return;
    }
    if (!img.complete) {
      console.log('Image not complete at index', index);
      return;
    }

    // Set canvas size to window size
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    // Calculate dimensions to cover the screen
    const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
    const x = (canvas.width - img.width * scale) / 2;
    const y = (canvas.height - img.height * scale) / 2;

    // Clear and draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    
    console.log(`Rendered frame ${index} at scroll progress`);
  };

  // Smooth animation loop
  useEffect(() => {
    if (!imagesLoaded) {
      console.log('Waiting for images to load...');
      return;
    }

    console.log('Setting up scroll animation...');

    const animate = () => {
      const current = currentFrameRef.current;
      const target = targetFrameRef.current;
      const diff = target - current;

      // Smooth interpolation
      if (Math.abs(diff) > 0.1) {
        currentFrameRef.current = current + diff * 0.15; // Smooth easing
        renderFrame(currentFrameRef.current);
        rafRef.current = requestAnimationFrame(animate);
      } else {
        currentFrameRef.current = target;
        renderFrame(target);
        rafRef.current = undefined;
      }
    };

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = window.scrollY;
      const progress = scrollHeight > 0 ? scrolled / scrollHeight : 0;

      // Map scroll to frame number
      const newTarget = progress * (TOTAL_FRAMES - 1);
      targetFrameRef.current = newTarget;

      console.log(`Scroll: ${scrolled}px, Progress: ${progress.toFixed(2)}, Target frame: ${newTarget.toFixed(1)}`);

      // Start animation if not running
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    const handleResize = () => {
      console.log('Resize detected');
      renderFrame(currentFrameRef.current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    // Initial render
    console.log('Triggering initial render');
    handleScroll();

    return () => {
      console.log('Cleaning up scroll animation');
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [imagesLoaded]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Canvas for frame rendering */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          opacity: 0.35,
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
      />
      
      {/* Loading indicator */}
      {!imagesLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-zinc-500 text-sm">Loading animation...</div>
        </div>
      )}
      
      {/* Gradient overlays for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/50 to-black/85" />
      
      {/* Vignette effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,black_100%)] opacity-60" />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />
    </div>
  );
}
