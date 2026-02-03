
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DownloadIcon } from './Icons';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  onDownload?: () => void;
  className?: string;
}

const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({ 
  beforeImage, 
  afterImage, 
  onDownload,
  className = ""
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = (x / rect.width) * 100;
      setSliderPosition(percentage);
    }
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) handleMove(e.clientX);
  }, [isDragging, handleMove]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (isDragging) handleMove(e.touches[0].clientX);
  }, [isDragging, handleMove]);

  const startDrag = () => setIsDragging(true);
  const stopDrag = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', stopDrag);
      window.addEventListener('touchend', stopDrag);
    } else {
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchend', stopDrag);
    }
    return () => {
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchend', stopDrag);
    };
  }, [isDragging]);

  return (
    <div 
      className={`relative w-full h-full select-none group overflow-hidden rounded-lg border border-slate-600 shadow-xl ${className}`}
      ref={containerRef}
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
      onMouseDown={startDrag}
      onTouchStart={startDrag}
    >
      {/* After Image (Base) */}
      <img 
        src={afterImage} 
        alt="After" 
        className="absolute inset-0 w-full h-full object-contain bg-slate-900/50" 
        draggable={false}
      />
      
      {/* Before Image (Overlay) */}
      <div 
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img 
          src={beforeImage} 
          alt="Before" 
          className="absolute inset-0 w-full h-full object-contain bg-slate-900/50" 
          style={{ width: `${100 / (sliderPosition / 100)}%`, maxWidth: 'none' }} // Counteract scaling to keep image static
          draggable={false}
        />
      </div>

      {/* Slider Handle */}
      <div 
        className="absolute inset-y-0 w-1 bg-white cursor-ew-resize flex items-center justify-center z-20 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center -ml-[1px]">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-800">
               <path d="m9 18-6-6 6-6"/>
               <path d="m15 6 6 6-6 6"/>
           </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded select-none pointer-events-none z-10">
        Before
      </div>
      <div className="absolute top-4 right-4 bg-emerald-600/80 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded select-none pointer-events-none z-10">
        After
      </div>

      {/* Hover Actions */}
      {onDownload && (
          <button 
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            className="absolute bottom-4 right-4 bg-slate-800/80 hover:bg-emerald-600 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all z-30"
            title="Tải ảnh kết quả"
          >
              <DownloadIcon className="w-5 h-5" />
          </button>
      )}
    </div>
  );
};

export default BeforeAfterSlider;
