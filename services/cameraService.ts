
export const getCameraDevices = async (): Promise<MediaDeviceInfo[]> => {
  if (!navigator.mediaDevices?.enumerateDevices) {
    console.warn("enumerateDevices() not supported.");
    return [];
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter(device => device.kind === 'videoinput');
};

export const startCamera = async (deviceId?: string): Promise<MediaStream> => {
  // Gunakan konstrain yang lebih fleksibel untuk menghindari kegagalan pada perangkat lama
  const videoConstraints: MediaTrackConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };

  if (deviceId) {
    // Jika ID spesifik diberikan, jangan paksa facingMode untuk menghindari konflik
    videoConstraints.deviceId = { exact: deviceId };
  } else {
    // Gunakan 'ideal' alih-alih 'exact' untuk facingMode agar ada fallback jika gagal
    videoConstraints.facingMode = { ideal: 'environment' };
  }

  return navigator.mediaDevices.getUserMedia({ 
    video: videoConstraints,
    audio: false // Pastikan audio tidak diminta kecuali diperlukan
  });
};
