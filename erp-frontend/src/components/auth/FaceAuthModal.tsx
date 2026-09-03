import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { X, Camera, RefreshCw, CheckCircle2, AlertCircle, ScanFace } from 'lucide-react';

interface FaceAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'login' | 'enroll';
  username?: string;
  onSuccess?: () => void;
}

export const FaceAuthModal: React.FC<FaceAuthModalProps> = ({
  isOpen,
  onClose,
  mode = 'login',
  username = 'admin',
  onSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { loginWithFace, enrollFace } = useAuth();
  const { error: notifyError } = useNotification();

  const [cameraActive, setCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Position your face in the camera frame');

  const startCamera = async () => {
    try {
      setStatusMessage('Starting camera stream...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setStatusMessage('Camera ready. Look directly into the camera.');
    } catch (err: any) {
      notifyError('Unable to access webcam: ' + (err.message || 'Permission denied'));
      setStatusMessage('Camera access failed.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (isOpen) {
      void startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const extractBiometricFeatures = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): number[] => {
    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const descriptor: number[] = new Array(128).fill(0);

    const cellW = Math.max(1, Math.floor(width / 4));
    const cellH = Math.max(1, Math.floor(height / 4));

    for (let cy = 0; cy < 4; cy++) {
      for (let cx = 0; cx < 4; cx++) {
        const cellIndex = (cy * 4 + cx) * 8;
        let rSum = 0, gSum = 0, bSum = 0, lumSum = 0;
        let gradX = 0, gradY = 0;
        let count = 0;

        const startX = cx * cellW;
        const startY = cy * cellH;

        for (let y = startY; y < startY + cellH; y += 2) {
          for (let x = startX; x < startX + cellW; x += 2) {
            const idx = (y * width + x) * 4;
            if (idx + 3 >= data.length) continue;
            const r = data[idx] / 255;
            const g = data[idx + 1] / 255;
            const b = data[idx + 2] / 255;
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            rSum += r;
            gSum += g;
            bSum += b;
            lumSum += lum;

            if (x + 2 < width) {
              const nextIdx = (y * width + (x + 2)) * 4;
              if (nextIdx + 3 < data.length) {
                const nextLum = 0.299 * (data[nextIdx] / 255) + 0.587 * (data[nextIdx + 1] / 255) + 0.114 * (data[nextIdx + 2] / 255);
                gradX += Math.abs(lum - nextLum);
              }
            }

            if (y + 2 < height) {
              const nextIdx = ((y + 2) * width + x) * 4;
              if (nextIdx + 3 < data.length) {
                const nextLum = 0.299 * (data[nextIdx] / 255) + 0.587 * (data[nextIdx + 1] / 255) + 0.114 * (data[nextIdx + 2] / 255);
                gradY += Math.abs(lum - nextLum);
              }
            }
            count++;
          }
        }

        if (count > 0) {
          descriptor[cellIndex] = rSum / count;
          descriptor[cellIndex + 1] = gSum / count;
          descriptor[cellIndex + 2] = bSum / count;
          descriptor[cellIndex + 3] = lumSum / count;
          descriptor[cellIndex + 4] = gradX / count;
          descriptor[cellIndex + 5] = gradY / count;
          descriptor[cellIndex + 6] = Math.sqrt(descriptor[cellIndex] ** 2 + descriptor[cellIndex + 1] ** 2);
          descriptor[cellIndex + 7] = Math.abs(descriptor[cellIndex + 4] - descriptor[cellIndex + 5]);
        }
      }
    }

    let norm = 0;
    for (let i = 0; i < 128; i++) {
      norm += descriptor[i] * descriptor[i];
    }
    norm = Math.sqrt(norm) || 1;
    return descriptor.map((v) => Number((v / norm).toFixed(6)));
  };

  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    setStatusMessage('Scanning biometric features...');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Standardize snapshot size to 320x240 for instantaneous processing and compact storage
      canvas.width = 320;
      canvas.height = 240;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      ctx.drawImage(video, 0, 0, 320, 240);
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.75);

      // Extract 128-d biometric descriptor instantly
      const descriptor = extractBiometricFeatures(canvas, ctx);

      if (mode === 'login') {
        setStatusMessage('Verifying biometric profile...');
        await loginWithFace(descriptor, username);
        stopCamera();
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setStatusMessage('Enrolling face signature...');
        await enrollFace(username, descriptor, imageBase64);
        stopCamera();
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setStatusMessage('Biometric verification failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="erp-modal-overlay">
      <div className="erp-modal" style={{ padding: '2rem', maxWidth: '28rem', textAlign: 'center' }}>
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--app-muted)',
            cursor: 'pointer',
            padding: '0.25rem',
            borderRadius: '50%',
          }}
        >
          <X size={20} />
        </button>

        <div
          style={{
            display: 'inline-flex',
            padding: '0.75rem',
            borderRadius: '1rem',
            background: 'var(--app-primary-light)',
            color: 'var(--app-primary)',
            marginBottom: '0.75rem',
          }}
        >
          <ScanFace size={28} />
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--app-text)' }}>
          {mode === 'login' ? 'Face Recognition Sign In' : 'Enroll Face Biometric'}
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--app-text-subtle)', marginTop: '0.25rem', marginBottom: '1.25rem' }}>
          {statusMessage}
        </p>

        {/* Video stream container */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '240px',
            backgroundColor: '#000',
            borderRadius: '0.75rem',
            overflow: 'hidden',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--app-primary)',
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Scanner targeting overlay */}
          <div
            style={{
              position: 'absolute',
              width: '160px',
              height: '160px',
              border: '2px dashed #38bdf8',
              borderRadius: '50%',
              pointerEvents: 'none',
              animation: 'pulseGlow 2s infinite',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={captureFace}
            disabled={!cameraActive || isProcessing}
            className="erp-btn erp-btn-primary"
            style={{ flex: 1, padding: '0.75rem' }}
          >
            {isProcessing ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Camera size={16} />
                <span>{mode === 'login' ? 'Authenticate Face' : 'Capture & Save'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
