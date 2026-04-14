import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ZoomDialProps {
  zoom: number;
  minZoom: number;
  maxZoom: number;
  onChange: (zoom: number) => void;
}

export function ZoomDial({ zoom, minZoom, maxZoom, onChange }: ZoomDialProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startZoom, setStartZoom] = useState(zoom);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setStartZoom(zoom);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    
    // Calculate delta X
    const deltaX = e.clientX - startX;
    
    // Sensitivity factor (pixels per 1x zoom)
    const sensitivity = 50; 
    
    let newZoom = startZoom - (deltaX / sensitivity);
    
    // Clamp
    newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
    
    // Snap to 1x, 2x, 3x etc if close
    const nearestInt = Math.round(newZoom);
    if (Math.abs(newZoom - nearestInt) < 0.1) {
      newZoom = nearestInt;
    }
    
    // Round to 1 decimal place
    newZoom = Math.round(newZoom * 10) / 10;
    
    onChange(newZoom);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // Generate tick marks
  const ticks = [];
  for (let i = minZoom; i <= maxZoom; i += 0.5) {
    ticks.push(i);
  }

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-[280px]">
      {/* Current Zoom Display */}
      <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20 text-white font-medium text-sm shadow-lg">
        {zoom.toFixed(1)}x
      </div>

      {/* Dial Container */}
      <div 
        ref={containerRef}
        className="relative w-full h-12 overflow-hidden touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Center Indicator */}
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-yellow-500 -translate-x-1/2 z-10" />
        
        {/* Ticks */}
        <div 
          className="absolute top-0 h-full flex items-end transition-transform duration-75 ease-linear"
          style={{
            // Center the current zoom level
            // Each 1x zoom unit is 50px wide
            transform: `translateX(calc(50% - ${(zoom - minZoom) * 50}px))`
          }}
        >
          {ticks.map((tick, i) => {
            const isMain = Number.isInteger(tick);
            return (
              <div 
                key={i} 
                className="flex flex-col items-center justify-end flex-shrink-0"
                style={{ width: '25px' }} // 0.5x = 25px, 1x = 50px
              >
                {isMain && (
                  <span className="text-[10px] text-white/70 font-mono mb-1">
                    {tick}
                  </span>
                )}
                <div 
                  className={cn(
                    "w-0.5 bg-white rounded-t-full",
                    isMain ? "h-4 opacity-80" : "h-2 opacity-40"
                  )} 
                />
              </div>
            );
          })}
        </div>
        
        {/* Gradient Masks */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80 pointer-events-none" />
      </div>
    </div>
  );
}
