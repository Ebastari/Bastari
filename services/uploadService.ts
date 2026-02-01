
import { PlantEntry } from '../types';

export const uploadToAppsScript = async (url: string, entry: PlantEntry): Promise<Response> => {
  const timestamp = new Date(entry.timestamp);
  const payload = {
    ID: entry.id,
    Tanggal: timestamp.toLocaleString('id-ID'),
    Lokasi: entry.lokasi,
    Pekerjaan: entry.pekerjaan,
    Tinggi: entry.tinggi,
    Koordinat: entry.gps ? `${entry.gps.lat},${entry.gps.lon}` : 'N/A',
    X: entry.gps ? entry.gps.lon : 'N/A',
    Y: entry.gps ? entry.gps.lat : 'N/A',
    Tanaman: entry.jenis,
    "Tahun Tanam": entry.tahun,
    Pengawas: entry.pengawas,
    Vendor: entry.vendor,
    Tim: entry.tim,
    Kesehatan: entry.kesehatan,
    Gambar: entry.foto,
    Gambar_Nama_File: `monitoring_tanaman/foto_${entry.id}.jpg`,
  };

  return fetch(url, {
    method: 'POST',
    mode: 'no-cors', // Important for simple Apps Script POST requests
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
};
