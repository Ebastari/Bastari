
import React, { useState, useMemo } from 'react';
import { PlantEntry } from '../types';
import { getHealthSummary } from '../services/geminiService';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell } from 'recharts';

declare const L: any;

interface AnalyticsPanelProps {
  entries: PlantEntry[];
}

const COLORS = {
  Sehat: '#10b981',
  Merana: '#f59e0b',
  Mati: '#ef4444'
};

// Haversine distance for GIS stats
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ entries }) => {
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const gisStats = useMemo(() => {
    const validGps = entries.filter(e => e.gps).map(e => e.gps!);
    if (validGps.length < 2) return null;

    // Calculate area bbox as rough estimation for density
    const lats = validGps.map(g => g.lat);
    const lons = validGps.map(g => g.lon);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    
    const width = calculateDistance(minLat, minLon, minLat, maxLon);
    const height = calculateDistance(minLat, minLon, maxLat, minLon);
    const areaHa = (width * height) / 10000; // converted to Hectares

    // Calculate average distance to neighbors
    let totalDist = 0;
    let pairs = 0;
    for (let i = 0; i < validGps.length; i++) {
        for (let j = i + 1; j < validGps.length; j++) {
            totalDist += calculateDistance(validGps[i].lat, validGps[i].lon, validGps[j].lat, validGps[j].lon);
            pairs++;
        }
    }

    return {
        areaHa: areaHa > 0 ? areaHa.toFixed(4) : "N/A",
        density: areaHa > 0 ? (validGps.length / areaHa).toFixed(0) : "N/A",
        avgDist: (totalDist / pairs).toFixed(2)
    };
  }, [entries]);

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    const result = await getHealthSummary(entries);
    setSummary(result);
    setIsLoading(false);
  };
  
  const healthData = useMemo(() => {
    const counts = { Sehat: 0, Merana: 0, Mati: 0 };
    entries.forEach(entry => {
        if (entry.kesehatan in counts) {
            counts[entry.kesehatan]++;
        }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, count: value }));
  }, [entries]);

  const heightVsYearData = useMemo(() => {
      return entries.map(e => ({
          tahun: e.tahun,
          tinggi: e.tinggi,
          kesehatan: e.kesehatan
      })).filter(e => e.tahun && e.tinggi);
  }, [entries]);

  const mapCenter = useMemo(() => {
    const validEntries = entries.filter(e => e.gps);
    if (validEntries.length > 0) {
      return [validEntries[0].gps!.lat, validEntries[0].gps!.lon] as [number, number];
    }
    return [-2.5489, 118.0149] as [number, number]; 
  }, [entries]);

  return (
    <div className="space-y-8 pb-10">
      {/* GIS Summary Cards */}
      {gisStats && (
        <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-600 p-4 rounded-2xl text-white shadow-lg">
                <p className="text-[10px] font-black uppercase opacity-60">Kepadatan</p>
                <p className="text-xl font-bold">{gisStats.density}</p>
                <p className="text-[9px]">Pohon / Ha</p>
            </div>
            <div className="bg-slate-800 p-4 rounded-2xl text-white shadow-lg">
                <p className="text-[10px] font-black uppercase opacity-60">Jarak Rata2</p>
                <p className="text-xl font-bold">{gisStats.avgDist}</p>
                <p className="text-[9px]">Meter</p>
            </div>
            <div className="bg-green-600 p-4 rounded-2xl text-white shadow-lg">
                <p className="text-[10px] font-black uppercase opacity-60">Area Pantau</p>
                <p className="text-xl font-bold">{gisStats.areaHa}</p>
                <p className="text-[9px]">Hektar (Est)</p>
            </div>
        </div>
      )}

      {/* AI Summary Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="text-blue-500">✨</span> Montana AI Insights
            </h3>
        </div>
        <div className={`p-5 rounded-2xl border transition-all ${summary ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-slate-200 shadow-inner'}`}>
            {isLoading ? (
                <div className="space-y-3 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                    <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                </div>
            ) : summary ? (
                <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br />') }} />
            ) : (
                <div className="text-center py-6">
                    <p className="text-slate-500 text-sm mb-4">Analisis spasial & pola tanam berbasis data koordinat aktif.</p>
                    <button 
                        onClick={handleGenerateSummary} 
                        disabled={entries.length < 2} 
                        className="px-8 py-3 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-xl shadow-blue-200 disabled:bg-slate-300 disabled:shadow-none transition-all active:scale-95"
                    >
                      Jalankan Analisis GIS
                    </button>
                    {entries.length < 2 && <p className="text-[10px] text-slate-400 mt-2">Minimal butuh 2 titik data GPS</p>}
                </div>
            )}
        </div>
      </section>

      {/* Map Section */}
      <section>
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 uppercase text-xs tracking-wider">
            <span className="text-green-500">📍</span> Peta Sebaran Pertumbuhan
        </h3>
        <div className="h-72 w-full rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-slate-100">
            <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={false} className="h-full w-full">
            <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {entries.map(entry => entry.gps && (
                <Marker key={entry.id} position={[entry.gps.lat, entry.gps.lon]}>
                <Popup className="custom-popup">
                    <div className="p-2 min-w-[150px]">
                        <img src={entry.foto} className="w-full h-20 object-cover rounded-lg mb-2" />
                        <p className="font-black text-xs text-blue-600 uppercase">{entry.jenis}</p>
                        <div className="flex justify-between mt-1 border-t border-slate-100 pt-1">
                            <span className="text-[10px] text-slate-500">Tinggi:</span>
                            <span className="text-[10px] font-bold">{entry.tinggi} cm</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[10px] text-slate-500">Status:</span>
                            <span className={`text-[10px] font-bold ${entry.kesehatan === 'Sehat' ? 'text-green-600' : 'text-red-600'}`}>{entry.kesehatan}</span>
                        </div>
                    </div>
                </Popup>
                </Marker>
            ))}
            </MapContainer>
        </div>
      </section>
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="font-black text-slate-400 mb-6 text-[10px] uppercase tracking-widest">Kondisi Kesehatan</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={healthData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                        {healthData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#3b82f6'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="font-black text-slate-400 mb-6 text-[10px] uppercase tracking-widest">Gradasi Tinggi (Tahun)</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" dataKey="tahun" name="Tahun" domain={['auto', 'auto']} tick={{fontSize: 10}} axisLine={false} />
                    <YAxis type="number" dataKey="tinggi" name="Tinggi" unit="cm" tick={{fontSize: 10}} axisLine={false} />
                    <ZAxis type="number" range={[100, 100]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name="Tanaman" data={heightVsYearData}>
                        {heightVsYearData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.kesehatan as keyof typeof COLORS] || '#8884d8'} />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
