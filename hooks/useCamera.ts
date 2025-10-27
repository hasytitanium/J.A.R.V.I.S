
import { useState, useCallback, useRef } from 'react';

type FacingMode = 'user' | 'environment';

export const useCamera = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>('user');
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  const startCamera = useCallback(async (mode: FacingMode) => {
    stopCamera();
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: false,
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setFacingMode(mode);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access the camera. Please check permissions.");
      if (err instanceof Error) {
          if(err.name === "NotAllowedError") {
              setError("Camera access was denied. Please allow camera permissions in your browser settings.");
          } else if (err.name === "NotFoundError") {
              setError("No camera was found on this device.");
          }
      }
    }
  }, [stopCamera]);

  const switchCamera = useCallback(() => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    startCamera(newFacingMode);
  }, [facingMode, startCamera]);

  return { stream, error, startCamera, stopCamera, switchCamera, facingMode };
};
