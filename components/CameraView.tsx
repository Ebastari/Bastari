
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { getCameraDevices, startCamera } from '../services/cameraService';
import { getGpsLocation } from '../services/gpsService';
import { GpsLocation, FormState } from '../types';
import { Compass } from './Compass';
import { InfoOverlay } from './InfoOverlay';

interface CameraViewProps {
  onCapture: (dataUrl: string) => void;
  formState: FormState;
  onFormStateChange: React.Dispatch<React.SetStateAction<FormState>>;
  entriesCount: number;
  gps: GpsLocation | null;
  onGpsUpdate: (gps: GpsLocation) => void;
  onShowSheet: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const PLANT_TYPES = ['Akasia', 'Sengon', 'Jati', 'Mahoni'];

export const CameraView: React.FC<CameraViewProps> = ({ onCapture, formState, onFormStateChange, entriesCount, gps, onGpsUpdate, onShowSheet, showToast }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shutterSoundRef = useRef<HTMLAudioElement>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | undefined>(undefined);
  const [isGpsLoading, setGpsLoading] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  
  const stopCurrentStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
        console.log(`Track ${track.label} stopped`);
      });
      videoRef.current.srcObject = null;
    }
  };

  const initializeCamera = useCallback(async (deviceId?: string) => {
    setCameraError(false);
    stopCurrentStream();
    
    try {
      console.log("Starting camera with deviceId:", deviceId || "default (environment)");
      const stream = await startCamera(deviceId);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Dapatkan info perangkat yang aktif
        const currentTrack = stream.getVideoTracks()[0];
        const settings = currentTrack.getSettings();
        setCurrentDeviceId(settings.deviceId);
        
        // Cobalah untuk memutar video secara eksplisit
        try {
          await videoRef.current.play();
          console.log("Video playing successfully");
        } catch (e) {
          console.warn("Autoplay was prevented or failed:", e);
        }
      }
    } catch (err: any) { // Type 'any' for broader error checking
      console.error("Failed to start camera:", err);
      setCameraError(true);
      
      let errorMessage = 'Gagal mengakses kamera. Pastikan izin diberikan.'; // Default message
      if (err instanceof DOMException || (err.name && typeof err.name === 'string')) {
        switch (err.name) {
          case 'NotAllowedError': // User denied permission
          case 'PermissionDeniedError': // Older spec name
            errorMessage = 'Akses kamera ditolak. Berikan izin di pengaturan browser Anda.';
            break;
          case 'NotFoundError': // No camera found
            errorMessage = 'Tidak ada kamera ditemukan di perangkat ini.';
            break;
          case 'NotReadableError': // Hardware error, device in use
            errorMessage = 'Kamera sedang digunakan atau tidak dapat diakses. Coba tutup aplikasi lain yang menggunakan kamera.';
            break;
          case 'OverconstrainedError': // Constraints couldn't be satisfied
            errorMessage = 'Kamera tidak mendukung pengaturan yang diminta.';
            break;
          case 'SecurityError': // Not on HTTPS, etc.
            errorMessage = 'Akses kamera diblokir karena masalah keamanan (mis. bukan HTTPS).';
            break;
          case 'AbortError': // Generic error
            errorMessage = 'Akses kamera dibatalkan.';
            break;
          default:
            errorMessage = `Gagal mengakses kamera: ${err.message || err.name}.`;
            break;
        }
      } else if (err.message) {
        errorMessage = `Gagal mengakses kamera: ${err.message}.`;
      }
      showToast(errorMessage, 'error');
    }
  }, [showToast]);

  useEffect(() => {
    const startup = async () => {
      // Alur yang benar untuk browser mobile: 
      // 1. Panggil getUserMedia dulu untuk memicu permintaan izin
      await initializeCamera();
      
      // 2. Setelah izin diberikan, baru enumerateDevices akan mengembalikan label yang benar
      const videoDevices = await getCameraDevices();
      setDevices(videoDevices);
      
      // 3. Jika kamera belakang ditemukan dan belum digunakan, coba switch ke sana
      const backCamera = videoDevices.find(d => 
        d.label.toLowerCase().includes('back') || 
        d.label.toLowerCase().includes('rear') ||
        d.label.toLowerCase().includes('environment')
      );
      
      if (backCamera && backCamera.deviceId !== currentDeviceId) {
        initializeCamera(backCamera.deviceId);
      }
    };

    startup();
    
    return () => {
      stopCurrentStream();
    };
  }, [initializeCamera]); // currentDeviceId tidak disertakan untuk menghindari infinite loop
  
  const handleSwitchCamera = () => {
    if (devices.length < 2) {
        showToast('Hanya satu kamera terdeteksi', 'info');
        return;
    }
    const currentIndex = devices.findIndex(d => d.deviceId === currentDeviceId);
    const nextDevice = devices[(currentIndex + 1) % devices.length];
    initializeCamera(nextDevice.deviceId);
  };

  const handleGpsClick = async () => {
    setGpsLoading(true);
    showToast('Sinkronisasi GPS...', 'info');
    try {
      const location = await getGpsLocation();
      onGpsUpdate(location);
      showToast('Lokasi terkunci!', 'success');
    } catch (err: any) {
      showToast('GPS Gagal', 'error');
    } finally {
      setGpsLoading(false);
    }
  };
  
  const handleCaptureClick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      showToast('Kamera belum siap', 'error');
      return;
    }

    if (navigator.vibrate) navigator.vibrate([50]);
    if (shutterSoundRef.current) {
        shutterSoundRef.current.currentTime = 0;
        shutterSoundRef.current.play().catch(console.error);
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset any previous filter just in case
    ctx.filter = 'none';

    // Apply filter if enabled
    if (formState.filterEnabled && formState.photoFilter !== 'none') {
      switch (formState.photoFilter) {
        case 'sepia': ctx.filter = 'sepia(100%)'; break;
        case 'grayscale': ctx.filter = 'grayscale(100%)'; break;
        case 'vintage': ctx.filter = 'sepia(60%) contrast(110%) brightness(90%)'; break;
        case 'noir': ctx.filter = 'grayscale(100%) contrast(120%) brightness(80%)'; break;
        case 'vibrant': ctx.filter = 'saturate(180%) contrast(120%)'; break;
        default: ctx.filter = 'none'; break; // Fallback
      }
    }

    // Draw video frame to canvas with applied filter (if any)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Reset filter for watermark to appear clean
    ctx.filter = 'none';
    
    // Watermark
    const margin = 40;
    const fontSize = Math.max(28, Math.round(canvas.height * 0.025));
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';

    const lines = [
        `ID: ${new Date().getTime()}`,
        `H: ${formState.tinggi}cm | Tipe: ${formState.jenis}`,
        gps ? `GPS: ${gps.lat.toFixed(6)}, ${gps.lon.toFixed(6)}` : 'GPS: No Signal',
        `Waktu: ${new Date().toLocaleString('id-ID')}`
    ];

    lines.reverse().forEach((line, index) => {
        const y = canvas.height - margin - (index * (fontSize + 15));
        ctx.fillText(line, margin, y);
    });

    onCapture(canvas.toDataURL('image/jpeg', 0.9));
  }, [gps, formState, onCapture, showToast]);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden flex items-center justify-center">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted
        className="absolute inset-0 w-full h-full object-cover" 
      />
      
      {cameraError && (
        <div className="z-30 text-center px-6">
          <p className="text-white/70 mb-4 font-medium">Kamera gagal diakses</p>
          <button 
            onClick={() => initializeCamera(currentDeviceId)} 
            className="px-8 py-3 bg-blue-600 border border-blue-400 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
          >
            Muat Ulang Kamera
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
      <audio ref={shutterSoundRef} src="https://www.soundjay.com/mechanical/camera-shutter-click-03.mp3" preload="auto" />

      {/* UI Top Overlay */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 safe-top">
        <Compass />
        <button onClick={onShowSheet} className="w-12 h-12 rounded-2xl bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all">
          <span className="text-xl">📊</span>
        </button>
      </div>

      <InfoOverlay formState={formState} entriesCount={entriesCount} gps={gps} />
      
      {/* UI Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 space-y-6 z-10 safe-bottom bg-gradient-to-t from-black/80 via-transparent">
        <div className="flex flex-col items-center gap-2">
          <div className="px-4 py-1.5 bg-blue-600/80 backdrop-blur-md rounded-full text-white font-bold text-xs shadow-xl border border-blue-400/50">
            {formState.tinggi} cm
          </div>
          <input 
            type="range" 
            min="5" 
            max="1500" 
            value={formState.tinggi} 
            onChange={e => onFormStateChange(prev => ({ ...prev, tinggi: parseInt(e.target.value) }))}
            className="w-full max-w-sm h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white" 
          />
        </div>

        <div className="flex justify-between items-center max-w-xs mx-auto">
          <button onClick={handleGpsClick} className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 transition-all ${gps ? 'bg-green-500/40' : 'bg-black/40'}`}>
            {isGpsLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (gps ? '🛰️' : '📍')}
          </button>
          <button onClick={handleCaptureClick} className="group relative w-20 h-20 flex items-center justify-center active:scale-90 transition-transform">
            <div className="absolute inset-0 rounded-full border-4 border-white/40" />
            <div className="w-16 h-16 bg-white rounded-full shadow-2xl" />
          </button>
          <div className="flex gap-2"> {/* Grouping filter and camera switch buttons */}
            <button
              onClick={() => onFormStateChange(prev => ({ ...prev, filterEnabled: !prev.filterEnabled }))}
              className={`w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all ${formState.filterEnabled ? 'bg-purple-600/60 border-purple-400/50' : ''}`}
              title="Toggle Photo Filter"
            >
              {formState.filterEnabled ? '✨' : '🎨'}
            </button>
            <button onClick={handleSwitchCamera} className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center">🔄</button>
          </div>
        </div>
        
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 px-2">
          {PLANT_TYPES.map(type => (
            <button 
              key={type} 
              onClick={() => onFormStateChange(prev => ({ ...prev, jenis: type }))}
              className={`flex-shrink-0 px-6 py-2.5 rounded-2xl text-[10px] font-black border transition-all ${formState.jenis === type ? 'bg-white border-white text-black shadow-lg shadow-white/20' : 'bg-black/40 border-white/10 text-white/60 backdrop-blur-sm'}`}
            >{type.toUpperCase()}</button>
          ))}
        </div>
      </div>

      <style>{`
        .safe-top { padding-top: max(1.5rem, env(safe-area-inset-top)); }
        .safe-bottom { padding-bottom: max(1.5rem, env(safe-area-inset-bottom)); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};
