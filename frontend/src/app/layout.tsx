'use client';

import './globals.css';
import { useEffect } from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Enhanced cursor shimmer trail
    const sparkles: HTMLDivElement[] = [];
    let throttle = false;

    const createSparkle = (x: number, y: number) => {
      if (throttle) return;
      throttle = true;
      setTimeout(() => { throttle = false; }, 30); // Faster spawning

      // Create 2-3 sparkles per trigger for density
      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const size = 3 + Math.random() * 6;
        const offsetX = (Math.random() - 0.5) * 20;
        const offsetY = (Math.random() - 0.5) * 20;
        const hue = Math.random() > 0.7 ? '255,255,255' : '212,175,55'; // Mix gold + white
        const sparkle = document.createElement('div');
        sparkle.style.cssText = `
          position: fixed;
          left: ${x + offsetX}px;
          top: ${y + offsetY}px;
          width: ${size}px;
          height: ${size}px;
          background: radial-gradient(circle, rgba(${hue},0.9), rgba(${hue},0.3), transparent);
          border-radius: 50%;
          pointer-events: none;
          z-index: 99999;
          box-shadow: 0 0 ${size * 2}px rgba(${hue},0.4);
          transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        `;
        document.body.appendChild(sparkle);
        sparkles.push(sparkle);

        const driftX = (Math.random() - 0.5) * 30;
        const driftY = -10 - Math.random() * 25;
        requestAnimationFrame(() => {
          sparkle.style.opacity = '0';
          sparkle.style.transform = `scale(0) translate(${driftX}px, ${driftY}px) rotate(${Math.random() * 180}deg)`;
        });

        setTimeout(() => {
          sparkle.remove();
          const idx = sparkles.indexOf(sparkle);
          if (idx > -1) sparkles.splice(idx, 1);
        }, 800);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (Math.random() > 0.5) return; // 50% of moves create sparkles (was 30%)
      createSparkle(e.clientX, e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      sparkles.forEach(s => s.remove());
    };
  }, []);

  return (
    <html lang="en">
      <head>
        <title>The Shubz-Taylor Recommendation Engine</title>
        <meta name="description" content="An immersive journey through Taylor Swift's musical universe. Discover cross-artist connections, explore eras, and find your next favorite song." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>✨</text></svg>" />
      </head>
      <body className="bg-[#050505] text-[#e8e8e8] min-h-screen overflow-x-hidden scan-line">
        {children}
      </body>
    </html>
  );
}
