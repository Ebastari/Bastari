
export interface GpsLocation {
  lat: number;
  lon: number;
  accuracy: number;
}

export interface PlantEntry {
  id: string;
  timestamp: string;
  tinggi: number;
  jenis: string;
  kesehatan: 'Sehat' | 'Merana' | 'Mati';
  lokasi: string;
  tahun: number;
  pekerjaan: string;
  pengawas: string;
  vendor: string;
  tim: string;
  gps: GpsLocation | null;
  foto: string; // base64 data URL
}

// FIX: Add FormState interface for form data type safety.
export interface FormState {
  tinggi: number;
  tahun: number;
  jenis: string;
  lokasi: string;
  kesehatan: 'Sehat' | 'Merana' | 'Mati';
  pekerjaan: string;
  pengawas: string;
  vendor: string;
  tim: string;
  filterEnabled: boolean; // New: Toggle for photo filters
  photoFilter: 'none' | 'sepia' | 'grayscale' | 'vintage' | 'noir' | 'vibrant'; // New: Selected photo filter
}

export interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}
