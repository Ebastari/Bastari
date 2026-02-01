
import React, { useState, useEffect, useCallback } from 'react';
import { CameraView } from './components/CameraView';
import { BottomSheet } from './components/BottomSheet';
import { useLocalStorage } from './hooks/useLocalStorage';
import { writeExifData } from './services/exifService';
import { uploadToAppsScript } from './services/uploadService';
// FIX: Import FormState type for type safety.
import { PlantEntry, GpsLocation, ToastState, FormState } from './types';
import { Toast } from './components/Toast';

const App: React.FC = () => {
  const [entries, setEntries] = useLocalStorage<PlantEntry[]>('monitoringData', []);
  const [isBottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // FIX: Apply the FormState type to the state for type safety. This resolves the error on line 52.
  const [formState, setFormState] = useState<FormState>({
    tinggi: 10,
    tahun: new Date().getFullYear(),
    jenis: 'Akasia',
    lokasi: '',
    kesehatan: 'Sehat',
    pekerjaan: '',
    pengawas: '',
    vendor: '',
    tim: '',
    filterEnabled: false, // Default: filters are off
    photoFilter: 'none',  // Default: no filter selected
  });

  const [gps, setGps] = useState<GpsLocation | null>(null);
  
  const [appsScriptUrl, setAppsScriptUrl] = useLocalStorage<string>('appsScriptUrl', '');

  useEffect(() => {
    if (gps) {
      setFormState(prev => ({ ...prev, lokasi: `${gps.lat.toFixed(6)},${gps.lon.toFixed(6)}` }));
    }
  }, [gps]);
  
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

  const handleCapture = useCallback(async (dataUrl: string) => {
    const timestamp = new Date();
    const id = `${timestamp.getFullYear()}${(timestamp.getMonth() + 1).toString().padStart(2, '0')}${timestamp.getDate().toString().padStart(2, '0')}-${timestamp.getHours().toString().padStart(2, '0')}${timestamp.getMinutes().toString().padStart(2, '0')}${timestamp.getSeconds().toString().padStart(2, '0')}`;

    const newEntry: Omit<PlantEntry, 'foto'> = {
      id,
      timestamp: timestamp.toISOString(),
      tinggi: formState.tinggi,
      jenis: formState.jenis,
      kesehatan: formState.kesehatan,
      lokasi: formState.lokasi,
      tahun: formState.tahun,
      pekerjaan: formState.pekerjaan,
      pengawas: formState.pengawas,
      vendor: formState.vendor,
      tim: formState.tim,
      gps: gps,
    };

    try {
      showToast('Menyisipkan EXIF data...', 'info', 1500);
      const photoWithExif = await writeExifData(dataUrl, newEntry);
      
      const finalEntry: PlantEntry = { ...newEntry, foto: photoWithExif };
      setEntries(prev => [...prev, finalEntry]);
      showToast('Foto berhasil disimpan!', 'success');

      if (appsScriptUrl) {
        showToast('Mengunggah ke Apps Script...', 'info');
        try {
          await uploadToAppsScript(appsScriptUrl, finalEntry);
          showToast('Berhasil diunggah ke Apps Script!', 'success');
        } catch (error) {
          console.error('Upload failed:', error);
          showToast('Gagal mengunggah, data disimpan lokal.', 'error');
        }
      }

    } catch (error) {
      console.error("Failed to process image:", error);
      showToast('Gagal memproses gambar.', 'error');
    }
  }, [formState, gps, setEntries, appsScriptUrl]);

  const handleClearData = () => {
    if (window.confirm('APAKAH ANDA YAKIN? Semua data lokal akan dihapus secara permanen.')) {
      setEntries([]);
      showToast('Semua data lokal telah dihapus.', 'success');
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-black text-slate-800">
      <CameraView 
        onCapture={handleCapture}
        formState={formState}
        onFormStateChange={setFormState}
        entriesCount={entries.length}
        gps={gps}
        onGpsUpdate={setGps}
        onShowSheet={() => setBottomSheetOpen(true)}
        showToast={showToast}
      />
      <BottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        entries={entries}
        formState={formState}
        onFormStateChange={setFormState}
        onClearData={handleClearData}
        appsScriptUrl={appsScriptUrl}
        onAppsScriptUrlChange={setAppsScriptUrl}
        showToast={showToast}
        gps={gps}
        onGpsUpdate={setGps}
      />
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
};

export default App;
