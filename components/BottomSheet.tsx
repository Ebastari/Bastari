
import React, { useState, useMemo } from 'react';
import { PlantEntry, GpsLocation, FormState } from '../types';
import { AnalyticsPanel } from './AnalyticsPanel';
import { exportToCSV, exportToZIP, exportToKMZ } from '../services/exportService';
import { getGpsLocation } from '../services/gpsService';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  entries: PlantEntry[];
  formState: FormState;
  onFormStateChange: React.Dispatch<React.SetStateAction<FormState>>;
  onClearData: () => void;
  appsScriptUrl: string;
  onAppsScriptUrlChange: (url: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  gps: GpsLocation | null;
  onGpsUpdate: (gps: GpsLocation) => void;
}

const ITEMS_PER_PAGE = 5;

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen, onClose, entries, formState, onFormStateChange, onClearData, appsScriptUrl, onAppsScriptUrlChange, showToast, gps, onGpsUpdate
}) => {
  const [activeTab, setActiveTab] = useState('form');
  const [currentPage, setCurrentPage] = useState(1);
  const [isGpsLoading, setGpsLoading] = useState(false);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFormStateChange((prev) => ({
      ...prev,
      [name]: e.target.type === 'number' ? (value === '' ? '' : Number(value)) : value,
    }));
  };
  
  const handleGpsClick = async () => {
    setGpsLoading(true);
    showToast('Mencari sinyal GPS...', 'info');
    try {
      const location = await getGpsLocation();
      onGpsUpdate(location);
      showToast('Lokasi GPS berhasil didapat!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal mendapat lokasi GPS.', 'error');
    } finally {
      setGpsLoading(false);
    }
  };

  const paginatedEntries = useMemo(() => {
    const sortedEntries = [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return sortedEntries.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [entries, currentPage]);
  
  const totalPages = Math.ceil(entries.length / ITEMS_PER_PAGE);

  return (
    <div className={`fixed inset-0 z-40 transition-colors duration-500 ${isOpen ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent pointer-events-none'}`} onClick={onClose}>
      <div
        className={`absolute bottom-0 left-0 right-0 h-[92vh] bg-white rounded-t-[32px] shadow-2xl transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) flex flex-col ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1.5 w-12 bg-slate-200 rounded-full mx-auto my-4 flex-shrink-0" />

        <div className="px-6 pb-2">
          <nav className="flex justify-between items-center bg-slate-100 p-1 rounded-2xl">
            {['form', 'data', 'analitik', 'pengaturan'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)} 
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
              >
                {tab === 'analitik' ? 'Grafik' : tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {activeTab === 'form' && (
             <div className="space-y-5">
               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <h3 className="font-bold text-sm text-slate-800 mb-4">Parameter Tanaman</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Tinggi (cm)</label>
                        <input type="number" name="tinggi" value={formState.tinggi} onChange={handleFormChange} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Tahun Tanam</label>
                        <input type="number" name="tahun" value={formState.tahun} onChange={handleFormChange} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Status Kesehatan</label>
                      <select name="kesehatan" value={formState.kesehatan} onChange={handleFormChange} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none appearance-none">
                        <option>Sehat</option><option>Merana</option><option>Mati</option>
                      </select>
                  </div>
               </div>

               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <h3 className="font-bold text-sm text-slate-800 mb-4">Metadata Lapangan</h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Pengawas</label>
                        <input type="text" name="pengawas" value={formState.pengawas} onChange={handleFormChange} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Vendor / Kontraktor</label>
                        <input type="text" name="vendor" value={formState.vendor} onChange={handleFormChange} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none" />
                    </div>
                  </div>
               </div>
             </div>
          )}
          
          {activeTab === 'data' && (
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">{entries.length} Entri Lokal</h3>
                </div>
                {entries.length === 0 ? (
                    <div className="py-20 text-center space-y-2">
                        <p className="text-slate-300 text-4xl">📸</p>
                        <p className="text-slate-400 text-sm">Belum ada data tersimpan.</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            {paginatedEntries.map(entry => (
                                <div key={entry.id} className="bg-white p-3 rounded-2xl border border-slate-100 flex gap-4 items-center group active:scale-[0.98] transition-all">
                                    <div className="relative h-16 w-16 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                                        <img src={entry.foto} className="h-full w-full object-cover" />
                                        <div className={`absolute inset-x-0 bottom-0 h-1 ${entry.kesehatan === 'Sehat' ? 'bg-green-500' : entry.kesehatan === 'Mati' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-bold text-sm truncate">{entry.jenis}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-bold">{entry.tinggi} cm</span>
                                            <span className="text-[10px] text-slate-400 truncate">{new Date(entry.timestamp).toLocaleTimeString('id-ID')}</span>
                                        </div>
                                    </div>
                                    <button className="p-2 text-slate-300 group-hover:text-blue-500">
                                        →
                                    </button>
                                </div>
                            ))}
                        </div>
                        {totalPages > 1 && (
                            <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-50">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 text-xs font-bold text-slate-500 disabled:opacity-30">SEBELUMNYA</button>
                                <span className="text-[10px] font-black text-slate-300 tracking-widest">{currentPage} / {totalPages}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 text-xs font-bold text-blue-600 disabled:opacity-30">SELANJUTNYA</button>
                            </div>
                        )}
                    </>
                )}
             </div>
          )}
          
          {activeTab === 'analitik' && <AnalyticsPanel entries={entries} />}
          
          {activeTab === 'pengaturan' && (
             <div className="space-y-8">
                {/* New Photo Filter Section */}
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter Foto Otomatis</h4>
                  <div className="flex items-center justify-between">
                    <label htmlFor="filterToggle" className="text-xs font-semibold text-slate-600">Aktifkan Filter</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="filterToggle"
                        className="sr-only peer"
                        checked={formState.filterEnabled}
                        onChange={(e) => onFormStateChange(prev => ({ ...prev, filterEnabled: e.target.checked }))}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-slate-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600">Pilih Filter</label>
                    <select
                      name="photoFilter"
                      value={formState.photoFilter}
                      onChange={handleFormChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    >
                      <option value="none">None</option>
                      <option value="sepia">Sepia</option>
                      <option value="grayscale">Grayscale</option>
                      <option value="vintage">Vintage</option>
                      <option value="noir">Noir</option>
                      <option value="vibrant">Vibrant</option>
                    </select>
                  </div>
                </section>
                {/* End New Photo Filter Section */}

                <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Cloud</h4>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600">URL Google Apps Script</label>
                    <input type="url" value={appsScriptUrl} onChange={(e) => onAppsScriptUrlChange(e.target.value)} placeholder="https://script.google.com/..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ekspor Massal</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <button onClick={() => exportToCSV(entries)} className="w-full p-4 bg-slate-100 rounded-2xl text-sm font-bold text-slate-700 active:bg-slate-200 transition-colors flex justify-between">
                        Export CSV <span>📊</span>
                    </button>
                    <button onClick={() => exportToKMZ(entries)} className="w-full p-4 bg-slate-100 rounded-2xl text-sm font-bold text-slate-700 active:bg-slate-200 transition-colors flex justify-between">
                        Export KMZ (Google Earth) <span>🌍</span>
                    </button>
                    <button onClick={() => exportToZIP(entries)} className="w-full p-4 bg-slate-100 rounded-2xl text-sm font-bold text-slate-700 active:bg-slate-200 transition-colors flex justify-between">
                        Download Image Pack (.zip) <span>📦</span>
                    </button>
                  </div>
                </section>

                <section className="pt-8 mt-8 border-t border-slate-100">
                    <button onClick={onClearData} className="w-full p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-black uppercase tracking-widest active:bg-red-100 transition-colors">
                        Reset Semua Data Lokal
                    </button>
                </section>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
