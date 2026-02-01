
import { PlantEntry } from '../types';

declare const piexif: any;

const toDMS = (coord: number): [[number, 1], [number, 1], [number, 100]] => {
  const absolute = Math.abs(coord);
  const degrees = Math.floor(absolute);
  const minutes = Math.floor((absolute - degrees) * 60);
  const seconds = (absolute - degrees - minutes / 60) * 3600;
  return [[degrees, 1], [minutes, 1], [Math.round(seconds * 100), 100]];
};

export const writeExifData = async (dataUrl: string, entryData: Omit<PlantEntry, 'foto'>): Promise<string> => {
  if (typeof piexif === 'undefined') {
    console.warn('piexifjs is not loaded. Skipping EXIF injection.');
    return dataUrl;
  }
  
  try {
    const { id, tinggi, jenis, lokasi, pengawas, gps, timestamp } = entryData;
    const dt = new Date(timestamp);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateTimeExif = `${dt.getFullYear()}:${pad(dt.getMonth() + 1)}:${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;

    const gpsData: any = {};
    if (gps && (gps.lat !== 0 || gps.lon !== 0)) {
      gpsData[piexif.GPSIFD.GPSLatitudeRef] = gps.lat < 0 ? "S" : "N";
      gpsData[piexif.GPSIFD.GPSLatitude] = toDMS(gps.lat);
      gpsData[piexif.GPSIFD.GPSLongitudeRef] = gps.lon < 0 ? "W" : "E";
      gpsData[piexif.GPSIFD.GPSLongitude] = toDMS(gps.lon);
      gpsData[piexif.GPSIFD.GPSMapDatum] = "WGS-84";
      gpsData[piexif.GPSIFD.GPSDateStamp] = `${dt.getUTCFullYear()}:${pad(dt.getUTCMonth() + 1)}:${pad(dt.getUTCDate())}`;
      gpsData[piexif.GPSIFD.GPSTimeStamp] = [dt.getUTCHours(), dt.getUTCMinutes(), dt.getUTCSeconds()];
    }

    const userComment = `ID:${id}; Tinggi:${tinggi}cm; Jenis:${jenis}; Lokasi:${lokasi}; Pengawas:${pengawas}`;

    const exifObj = {
      "0th": {
        [piexif.ImageIFD.Make]: "Aplikasi Monitoring Cerdas",
        [piexif.ImageIFD.Software]: "React PWA v1.0",
        [piexif.ImageIFD.DateTime]: dateTimeExif,
      },
      "Exif": {
        [piexif.ExifIFD.DateTimeOriginal]: dateTimeExif,
        [piexif.ExifIFD.DateTimeDigitized]: dateTimeExif,
        [piexif.ExifIFD.UserComment]: piexif.helper.encodeText(userComment, 'unicode'),
      },
      "GPS": gpsData,
    };

    const exifStr = piexif.dump(exifObj);
    return piexif.insert(exifStr, dataUrl);
  } catch (e) {
    console.error("EXIF write failed:", e);
    return dataUrl; // Return original if fails
  }
};
