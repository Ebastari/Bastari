
import React from 'react';
import Draggable from 'react-draggable';
import { GpsLocation } from '../types';

interface InfoOverlayProps {
  formState: { jenis: string; tinggi: number; lokasi: string };
  entriesCount: number;
  gps: GpsLocation | null;
}

export const InfoOverlay: React.FC<InfoOverlayProps> = ({ formState, entriesCount, gps }) => {
  // Menentukan warna berdasarkan akurasi (GIS standard)
  const getAccuracyColor = (accuracy: number) => {
    if (accuracy <= 5) return 'text-green-400'; // High precision
    if (accuracy <= 15) return 'text-yellow-400'; // Medium precision
    return 'text-red-400'; // Low precision
  };

  return (
    <Draggable bounds="parent">
      <div className="absolute top-24 left-6 z-20 min-w-[180px] bg-black/50 backdrop-blur-xl text-white p-5 rounded-[2rem] border border-white/10 shadow-2xl cursor-move touch-none active:scale-95 transition-transform group">
        <div className="flex items-center gap-2 mb-4">
            <div className={`w-1.5 h-1.5 rounded-full ${gps ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 animate-pulse'}`} />
            <p className="font-black text-[9px] uppercase tracking-[0.2em] text-white/40">Montana Monitor</p>
        </div>
        
        <div className="space-y-4">
            <div className="flex flex-col">
                <span className="text-[9px] text-white/30 uppercase font-black tracking-wider">Target Spesies</span>
                <span className="text-sm font-bold truncate tracking-tight">{formState.jenis || 'None'}</span>
            </div>
            
            <div className="flex flex-col">
                <span className="text-[9px] text-white/30 uppercase font-black tracking-wider">Tinggi Input</span>
                <span className="text-sm font-bold text-blue-400 tracking-tight">{formState.tinggi} cm</span>
            </div>

            <div className="flex flex-col">
                <span className="text-[9px] text-white/30 uppercase font-black tracking-wider">Database Lokal</span>
                <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold tracking-tight">{entriesCount}</span>
                    <span className="text-[9px] text-white/30 font-bold uppercase">Entri</span>
                </div>
            </div>
        </div>

        {gps ? (
            <div className="mt-4 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px]">🛰️</span>
                        <span className="text-[10px] font-black text-green-400 tracking-tighter">LOCKED</span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold ${getAccuracyColor(gps.accuracy)}`}>
                        ±{gps.accuracy.toFixed(1)}m
                    </span>
                </div>
                <div className="mt-1.5 flex flex-col opacity-40 font-mono text-[8px] tracking-tighter">
                    <span>LAT: {gps.lat.toFixed(6)}</span>
                    <span>LON: {gps.lon.toFixed(6)}</span>
                </div>
            </div>
        ) : (
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-[9px] font-black text-red-500/80 tracking-widest animate-pulse flex items-center gap-1.5">
                    <span className="text-[10px]">📡</span> NO SIGNAL
                </span>
            </div>
        )}
        
        {/* Drag handle visual cue */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/5 rounded-full group-hover:bg-white/10 transition-colors" />
      </div>
    </Draggable>
  );
};
