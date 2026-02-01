
import { GoogleGenAI } from "@google/genai";
import { PlantEntry } from '../types';

export const getHealthSummary = async (entries: PlantEntry[]): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return "Error: API key for Gemini is not configured.";
  }
  
  if (entries.length === 0) {
    return "Belum ada data untuk dianalisis. Silakan ambil beberapa foto terlebih dahulu.";
  }

  // Menggunakan model Pro untuk analisis reasoning GIS yang kompleks
  const ai = new GoogleGenAI({ apiKey });

  const simplifiedData = entries.map(e => ({
    tinggi: e.tinggi,
    kesehatan: e.kesehatan,
    tahun: e.tahun,
    jenis: e.jenis,
    koordinat: e.gps ? `${e.gps.lat},${e.gps.lon}` : 'N/A'
  }));

  const prompt = `
    Anda adalah GIS Analyst & Environmental Spatial Data Scientist senior. 
    Analisis data monitoring revegetasi berikut dengan standar profesional:

    DATA LAPANGAN:
    ${JSON.stringify(simplifiedData, null, 2)}

    TUGAS ANALISIS:
    1. **Analisis Spasial Tinggi Tanaman**: Klasifikasikan zona tumbuh (Baik/Sedang/Buruk) berdasarkan sebaran tinggi tanaman.
    2. **Analisis Kepadatan & Pola Tanam**: Evaluasi pola sebaran (Grid, Acak, atau Mengelompok/Clustered). Berikan estimasi apakah kepadatan saat ini sudah ideal atau perlu penambahan.
    3. **Identifikasi Area Prioritas**: Tentukan area mana yang memerlukan intervensi segera (penyulaman/pemupukan).
    4. **Interpretasi GIS**: Jelaskan hubungan antara lokasi koordinat dengan keberhasilan pertumbuhan.

    FORMAT OUTPUT (Markdown):
    - ### 🗺️ Analisis Spasial & Kepadatan
    - ### 📈 Statistik Pertumbuhan
    - ### 🛠️ Rekomendasi Teknis (Penyulaman/Intervensi)

    Gunakan bahasa Indonesia yang teknis namun mudah dipahami oleh pengawas lapangan.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7,
        topP: 0.95,
      }
    });
    return response.text || "Tidak ada respon dari AI.";
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Terjadi kesalahan analisis GIS. Pastikan data GPS tersedia.";
  }
};
