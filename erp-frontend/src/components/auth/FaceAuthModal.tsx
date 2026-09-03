import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  X,
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ScanFace,
  FlipHorizontal,
  RotateCcw,
  Check,
  Eye,
} from 'lucide-react';

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
  const { error: notifyError, success: notifySuccess } = useNotification();

  const [cameraActive, setCameraActive] = useState(false);
  // false = Real / True Camera Sensor Image; true = Mirrored Selfie Image
  const [isMirrored, setIsMirrored] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Position your face in the camera frame');

  // Preview state after capture (allows flipping between Real & Mirrored before saving)
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewIsMirrored, setPreviewIsMirrored] = useState<boolean>(false);

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
      setStatusMessage('Camera ready. Choose Real or Mirrored mode, then capture.');
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
      setPreviewImage(null);
      void startCamera();
    } else {
      stopCamera();
      setPreviewImage(null);
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

  // Step 1: Capture snapshot from video feed
  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = 320;
    canvas.height = 240;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (isMirrored) {
      // Draw flipped horizontally for mirror mode
      ctx.translate(320, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, 320, 240);
    ctx.restore();

    const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);
    setPreviewImage(imageBase64);
    setPreviewIsMirrored(isMirrored);

    if (mode === 'login') {
      // For login mode, proceed directly with authentication
      void processAuthentication(canvas, ctx, imageBase64);
    } else {
      setStatusMessage('Snapshot captured. You can flip between Real & Mirrored before saving.');
    }
  };

  // Flip the captured photo horizontally in real-time
  const flipCapturedSnapshot = () => {
    if (!previewImage || !canvasRef.current) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Flip the existing preview image
      ctx.save();
      ctx.translate(320, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, 320, 240);
      ctx.restore();

      const newBase64 = canvas.toDataURL('image/jpeg', 0.85);
      setPreviewImage(newBase64);
      setPreviewIsMirrored((prev) => !prev);
    };
    img.src = previewImage;
  };

  // Step 2: Finalize Enrollment or Login
  const confirmAndSavePhoto = async () => {
    if (!canvasRef.current || !previewImage) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    await processAuthentication(canvas, ctx, previewImage);
  };

  const processAuthentication = async (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, imageBase64: string) => {
    setIsProcessing(true);
    setStatusMessage('Processing biometric features...');

    try {
      const descriptor = extractBiometricFeatures(canvas, ctx);

      if (mode === 'login') {
        setStatusMessage('Verifying biometric identity...');
        await loginWithFace(descriptor, username);
        stopCamera();
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setStatusMessage('Saving biometric profile & photo...');
        await enrollFace(username, descriptor, imageBase64);
        notifySuccess(`Face & profile photo enrolled successfully as ${previewIsMirrored ? 'Mirrored Image' : 'Real Image'}!`);
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

  const retakePhoto = () => {
    setPreviewImage(null);
    setStatusMessage('Camera ready. Look directly into the camera.');
  };

  if (!isOpen) return null;

  return (
    <div className="erp-modal-overlay">
      <div className="erp-modal" style={{ padding: '2rem', maxWidth: '30rem', textAlign: 'center' }}>
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
          {mode === 'login' ? 'Face Recognition Sign In' : 'Enroll Face & Profile Photo'}
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--app-text-subtle)', marginTop: '0.25rem', marginBottom: '1rem' }}>
          {statusMessage}
        </p>

        {/* Real vs Mirrored Live Selection Tabs */}
        {!previewImage && (
          <div
            style={{
              display: 'flex',
              background: 'var(--app-hover)',
              padding: '0.25rem',
              borderRadius: '0.625rem',
              marginBottom: '1rem',
              border: '1px solid var(--app-border)',
              gap: '0.25rem',
            }}
          >
            <button
              type="button"
              onClick={() => setIsMirrored(false)}
              style={{
                flex: 1,
                padding: '0.4rem 0.6rem',
                borderRadius: '0.45rem',
                border: 'none',
                background: !isMirrored ? 'var(--app-primary)' : 'transparent',
                color: !isMirrored ? '#fff' : 'var(--app-text)',
                fontWeight: !isMirrored ? 700 : 500,
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                transition: 'all 0.15s ease',
              }}
            >
              <Eye size={14} />
              <span>📷 Real / True Photo</span>
            </button>
            <button
              type="button"
              onClick={() => setIsMirrored(true)}
              style={{
                flex: 1,
                padding: '0.4rem 0.6rem',
                borderRadius: '0.45rem',
                border: 'none',
                background: isMirrored ? 'var(--app-primary)' : 'transparent',
                color: isMirrored ? '#fff' : 'var(--app-text)',
                fontWeight: isMirrored ? 700 : 500,
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                transition: 'all 0.15s ease',
              }}
            >
              <FlipHorizontal size={14} />
              <span>🪞 Mirrored Selfie</span>
            </button>
          </div>
        )}

        {/* Video / Snapshot Display */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '240px',
            backgroundColor: '#000',
            borderRadius: '0.75rem',
            overflow: 'hidden',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--app-primary)',
          }}
        >
          {previewImage ? (
            <img
              src={previewImage}
              alt="Captured biometric preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: isMirrored ? 'scaleX(-1)' : 'scaleX(1)',
                  transition: 'transform 0.25s ease',
                }}
              />
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
            </>
          )}

          {/* Active Mode Indicator Badge */}
          <div
            style={{
              position: 'absolute',
              bottom: '0.5rem',
              right: '0.5rem',
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(6px)',
              color: '#fff',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.2rem 0.5rem',
              borderRadius: '0.375rem',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            {previewImage
              ? previewIsMirrored
                ? '🪞 Mirrored Photo'
                : '📷 Real Photo'
              : isMirrored
              ? '🪞 Mirrored Mode'
              : '📷 Real Mode'}
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {/* Actions Controls */}
        {previewImage ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Flip Horizontal button on captured photo */}
            <button
              type="button"
              onClick={flipCapturedSnapshot}
              className="erp-btn erp-btn-secondary"
              style={{
                width: '100%',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
              }}
            >
              <FlipHorizontal size={16} />
              <span>Flip Image (Switch to {previewIsMirrored ? 'Real Photo' : 'Mirrored Photo'})</span>
            </button>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={retakePhoto}
                className="erp-btn erp-btn-secondary"
                style={{ flex: 1, padding: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
              >
                <RotateCcw size={16} />
                <span>Retake</span>
              </button>
              <button
                type="button"
                onClick={confirmAndSavePhoto}
                disabled={isProcessing}
                className="erp-btn erp-btn-primary"
                style={{ flex: 2, padding: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Save {previewIsMirrored ? 'Mirrored' : 'Real'} Photo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={takeSnapshot}
              disabled={!cameraActive || isProcessing}
              className="erp-btn erp-btn-primary"
              style={{ flex: 1, padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Camera size={16} />
                  <span>{mode === 'login' ? 'Authenticate Face' : `Take ${isMirrored ? 'Mirrored' : 'Real'} Photo`}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
