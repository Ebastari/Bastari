
import React, { useState, useEffect } from 'react';

export const Compass: React.FC = () => {
  const [heading, setHeading] = useState<number | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // Cek apakah perangkat memerlukan permintaan izin eksplisit (iOS 13+)
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      setNeedsPermission(true);
    } else {
      startCompass();
    }
  }, []);

  const startCompass = () => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      let alpha = event.alpha; // 0-360
      
      // Khusus iOS menggunakan webkitCompassHeading
      if (typeof (event as any).webkitCompassHeading !== 'undefined') {
        alpha = (event as any).webkitCompassHeading;
      }
      
      if (alpha !== null) {
        setHeading(Math.round(alpha));
        setIsActive(true);
      }
    };
    
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  };

  const requestPermission = async () => {
    try {
      const response = await (DeviceOrientationEvent as any).requestPermission();
      if (response === 'granted') {
        setNeedsPermission(false);
        startCompass();
      }
    } catch (error) {
      console.error("Compass permission denied", error);
    }
  };

  const getDirectionLabel = (h: number) => {
    const sectors = ['U', 'UT', 'T', 'TG', 'S', 'BD', 'B', 'BL'];
    return sectors[Math.round(h / 45) % 8];
  };

  if (needsPermission && !isActive) {
    return (
      <button 
        onClick={requestPermission}
        className="w-12 h-12 rounded-full bg-blue-600/80 backdrop-blur-md text-white flex items-center justify-center border border-white/40 shadow-lg animate-bounce"
        title="Aktifkan Kompas"
      >
        <span className="text-lg">🧭</span>
      </button>
    );
  }

  return (
    <div className="relative w-16 h-16 flex items-center justify-center group">
      {/* Outer Ring */}
      <div className="absolute inset-0 rounded-full border-2 border-white/20 backdrop-blur-md bg-black/30 shadow-2xl" />
      
      {/* Rotating Ring */}
      <div 
        className="absolute inset-1 border border-white/10 rounded-full transition-transform duration-150 ease-out"
        style={{ transform: `rotate(${- (heading || 0)}deg)` }}
      >
        {/* Cardinal Points */}
        <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 text-[8px] font-black text-red-500">N</span>
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 text-[8px] font-black text-white/40">S</span>
        <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 text-[8px] font-black text-white/40">W</span>
        <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 text-[8px] font-black text-white/40">E</span>
      </div>

      {/* Center Info */}
      <div className="z-10 flex flex-col items-center">
        <span className="text-[10px] font-black leading-none text-white drop-shadow-md">
          {heading !== null ? getDirectionLabel(heading) : '--'}
        </span>
        <span className="text-[8px] font-mono text-white/60 leading-none mt-0.5">
          {heading !== null ? `${heading}°` : ''}
        </span>
      </div>

      {/* Static Indicator */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-3 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)] z-20" />
    </div>
  );
};
