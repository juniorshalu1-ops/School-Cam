import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Compass,
  Download,
  Flashlight,
  Grid,
  Image as ImageIcon,
  Layers,
  MapPin,
  RefreshCw,
  Settings,
  Upload,
  Volume2,
  VolumeX,
  Zap,
  ZapOff,
} from 'lucide-react';
import { FacingMode, FlashMode, GeoData, WatermarkConfig } from '../types';
import { soundService } from '../services/audio';
import { formatCoordinates, getCardinalDirection } from '../services/geolocation';

interface CameraViewProps {
  geoData: GeoData;
  facingMode: FacingMode;
  flashMode: FlashMode;
  watermarkConfig: WatermarkConfig;
  gridEnabled: boolean;
  levelEnabled: boolean;
  soundEnabled: boolean;
  onToggleFacingMode: () => void;
  onCycleFlashMode: () => void;
  onToggleGrid: () => void;
  onToggleLevel: () => void;
  onToggleSound: () => void;
  onOpenGallery: () => void;
  onOpenSettings: () => void;
  onOpenInstall: () => void;
  onCapture: (capturedCanvas: HTMLCanvasElement) => void;
  savedPhotosCount: number;
}

export const CameraView: React.FC<CameraViewProps> = ({
  geoData,
  facingMode,
  flashMode,
  watermarkConfig,
  gridEnabled,
  levelEnabled,
  soundEnabled,
  onToggleFacingMode,
  onCycleFlashMode,
  onToggleGrid,
  onToggleLevel,
  onToggleSound,
  onOpenGallery,
  onOpenSettings,
  onOpenInstall,
  onCapture,
  savedPhotosCount,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScreenFlashing, setIsScreenFlashing] = useState<boolean>(false);
  const [isShutterPressed, setIsShutterPressed] = useState<boolean>(false);
  const [deviceTilt, setDeviceTilt] = useState<{ gamma: number; beta: number }>({ gamma: 0, beta: 0 });
  const [simulatedCanvasActive, setSimulatedCanvasActive] = useState<boolean>(false);
  const simCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const simAnimRef = useRef<number | null>(null);

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setSimulatedCanvasActive(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported on this device/browser');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }

      applyTorchConstraint(stream, flashMode === 'torch');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to access camera';
      console.warn('Camera start error:', msg);
      setCameraError(msg);
      setCameraActive(false);
      startSimulation();
    }
  }, [facingMode, flashMode]);

  const applyTorchConstraint = (stream: MediaStream, torchOn: boolean) => {
    try {
      const track = stream.getVideoTracks()[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const capabilities = track.getCapabilities ? (track.getCapabilities() as any) : {};
      if (capabilities && capabilities.torch) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        track.applyConstraints({ advanced: [{ torch: torchOn }] as any });
      }
    } catch (e) {
      console.warn('Torch constraint not applied:', e);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (simAnimRef.current) {
        cancelAnimationFrame(simAnimRef.current);
      }
    };
  }, [facingMode, startCamera]);

  useEffect(() => {
    if (streamRef.current) {
      applyTorchConstraint(streamRef.current, flashMode === 'torch');
    }
  }, [flashMode]);

  useEffect(() => {
    if (!levelEnabled) return;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        setDeviceTilt({
          gamma: Math.round(e.gamma),
          beta: Math.round(e.beta),
        });
      }
    };
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [levelEnabled]);

  // Simulated live camera scene if real camera is not available
  const startSimulation = () => {
    setSimulatedCanvasActive(true);
    let frame = 0;
    const renderSim = () => {
      const cvs = simCanvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext('2d');
      if (!ctx) return;
      frame++;

      cvs.width = 1280;
      cvs.height = 720;

      // School building & Campus scene simulation
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 480);
      skyGrad.addColorStop(0, '#1e3a8a');
      skyGrad.addColorStop(0.5, '#38bdf8');
      skyGrad.addColorStop(1, '#bae6fd');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, 1280, 480);

      // School building facade
      ctx.fillStyle = '#b91c1c'; // Brick red
      ctx.fillRect(340, 220, 600, 280);

      // Building Roof triangular pediment
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.moveTo(320, 220);
      ctx.lineTo(640, 100);
      ctx.lineTo(960, 220);
      ctx.closePath();
      ctx.fill();

      // School Clock / Badge
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(640, 165, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Windows
      ctx.fillStyle = '#e0f2fe';
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 5; c++) {
          ctx.fillRect(380 + c * 105, 260 + r * 100, 60, 65);
        }
      }

      // School Lawn
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0, 500, 1280, 220);

      // School Path
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(560, 500);
      ctx.lineTo(720, 500);
      ctx.lineTo(840, 720);
      ctx.lineTo(440, 720);
      ctx.closePath();
      ctx.fill();

      // SchoolCam Watermark on simulation preview
      ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#ef4444';
      ctx.fillText('SchoolCam by Satyam', 40, 60);

      ctx.font = '600 18px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText(`GPS LIVE TELEMETRY · CAMPUS PREVIEW · HEADING ${geoData.heading || 45}°`, 40, 95);

      simAnimRef.current = requestAnimationFrame(renderSim);
    };

    simAnimRef.current = requestAnimationFrame(renderSim);
  };

  // Capture shutter action
  const handleCaptureClick = async () => {
    setIsShutterPressed(true);
    soundService.triggerHaptic('shutter');

    if (flashMode === 'on') {
      setIsScreenFlashing(true);
      await new Promise((r) => setTimeout(r, 120));
    }

    soundService.playShutterSound(soundEnabled);

    const canvas = document.createElement('canvas');

    if (cameraActive && videoRef.current && videoRef.current.videoWidth > 0) {
      const v = videoRef.current;
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      }
    } else if (simCanvasRef.current) {
      canvas.width = simCanvasRef.current.width;
      canvas.height = simCanvasRef.current.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(simCanvasRef.current, 0, 0);
      }
    } else {
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 1280, 720);
      }
    }

    if (flashMode === 'on') {
      await new Promise((r) => setTimeout(r, 80));
      setIsScreenFlashing(false);
    }

    setTimeout(() => {
      setIsShutterPressed(false);
      onCapture(canvas);
    }, 100);
  };

  // Upload photo handler from device
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundService.triggerHaptic('click');
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          onCapture(canvas);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  const isLevelCentered = Math.abs(deviceTilt.gamma) <= 3 && Math.abs(deviceTilt.beta) <= 45;

  return (
    <div className="relative w-full h-full flex flex-col bg-black overflow-hidden select-none">
      {/* Hidden File Input for Uploading Photos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* 1. Screen Flash overlay */}
      {isScreenFlashing && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-150 animate-pulse" />
      )}

      {/* 2. Main Viewfinder Display */}
      <div className="relative flex-1 w-full bg-slate-950 overflow-hidden flex items-center justify-center">
        {/* Real Video Element */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            cameraActive ? 'opacity-100' : 'opacity-0'
          } ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
        />

        {/* Fallback Simulated Canvas */}
        {simulatedCanvasActive && (
          <canvas ref={simCanvasRef} className="w-full h-full object-cover" />
        )}

        {/* Camera Permission / Error Banner */}
        {cameraError && !simulatedCanvasActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/95 z-20">
            <div className="w-20 h-20 rounded-full border-2 border-red-500 overflow-hidden mb-4 shadow-xl">
              <img
                src="/assets/aistudio/ic_launcher_c43f4821.png"
                alt="SchoolCam App Icon"
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">SchoolCam Camera Access</h3>
            <p className="text-sm text-slate-400 max-w-sm mb-6">
              Camera access is restricted. You can upload existing photos directly to stamp with "SchoolCam by Satyam", GPS coordinates, and notes!
            </p>
            <div className="flex gap-3">
              <button
                onClick={startCamera}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors"
              >
                Retry Camera
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-lg shadow-red-500/30"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Photo</span>
              </button>
            </div>
          </div>
        )}

        {/* Rule of Thirds Grid Overlay */}
        {gridEnabled && (
          <div className="absolute inset-0 pointer-events-none z-10 grid grid-cols-3 grid-rows-3 border border-white/10">
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div />
          </div>
        )}

        {/* Artificial Horizon / Spirit Level */}
        {levelEnabled && (
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
            <div
              className={`w-40 h-[2px] transition-all duration-75 ${
                isLevelCentered ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-white/40'
              }`}
              style={{
                transform: `rotate(${deviceTilt.gamma}deg)`,
              }}
            />
            <div
              className={`w-2.5 h-2.5 rounded-full border border-white transition-colors duration-75 ${
                isLevelCentered ? 'bg-red-500' : 'bg-transparent'
              }`}
            />
          </div>
        )}

        {/* Red Watermark Preview Badge with Official App Icon on Live Viewfinder */}
        <div className="absolute top-16 right-3 z-20 pointer-events-none">
          <div className="bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-red-500/60 shadow-2xl flex items-center gap-2">
            <img
              src="/assets/aistudio/ic_launcher_c43f4821.png"
              alt="SchoolCam Icon"
              className="w-5 h-5 rounded-full border border-red-500 object-cover shrink-0"
            />
            <span className="text-xs font-bold text-red-500 tracking-wide">
              SchoolCam by Satyam
            </span>
          </div>
        </div>

        {/* TOP BAR OVERLAY CONTROLS */}
        <div className="absolute top-0 left-0 right-0 z-20 p-3 pt-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between">
          {/* Flash Toggle Button */}
          <button
            onClick={onCycleFlashMode}
            className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-full flex items-center gap-1.5 backdrop-blur-md transition-all active:scale-95 ${
              flashMode === 'on'
                ? 'bg-amber-400 text-slate-950 font-bold'
                : flashMode === 'torch'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                : 'bg-black/50 text-white/90 border border-white/10 hover:bg-black/70'
            }`}
            title={`Flash: ${flashMode.toUpperCase()}`}
          >
            {flashMode === 'off' && <ZapOff className="w-4 h-4" />}
            {flashMode === 'on' && <Zap className="w-4 h-4 fill-current" />}
            {flashMode === 'torch' && <Flashlight className="w-4 h-4" />}
            <span className="text-[11px] font-mono uppercase tracking-wider">
              {flashMode === 'torch' ? 'TORCH' : flashMode === 'on' ? 'FLASH' : 'OFF'}
            </span>
          </button>

          {/* App Wordmark with Official App Icon */}
          <div className="flex items-center gap-2">
            <img
              src="/assets/aistudio/ic_launcher_c43f4821.png"
              alt="SchoolCam App Icon"
              className="w-8 h-8 rounded-full border border-red-500 shadow-md object-cover"
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white tracking-wide leading-tight">SchoolCam</span>
              <span className="text-[9px] font-bold text-red-500 leading-tight">by Satyam</span>
            </div>
          </div>

          {/* Quick status controls */}
          <div className="flex items-center gap-2">
            {/* Grid toggle */}
            <button
              onClick={onToggleGrid}
              className={`min-h-[40px] min-w-[40px] p-2 rounded-full backdrop-blur-md transition-all active:scale-95 ${
                gridEnabled ? 'bg-red-500/30 text-red-300 border border-red-400/40' : 'bg-black/50 text-white/70 hover:text-white'
              }`}
              title="Toggle Grid"
            >
              <Grid className="w-4 h-4" />
            </button>

            {/* Level toggle */}
            <button
              onClick={onToggleLevel}
              className={`min-h-[40px] min-w-[40px] p-2 rounded-full backdrop-blur-md transition-all active:scale-95 ${
                levelEnabled ? 'bg-red-500/30 text-red-300 border border-red-400/40' : 'bg-black/50 text-white/70 hover:text-white'
              }`}
              title="Toggle Level"
            >
              <Compass className="w-4 h-4" />
            </button>

            {/* Sound toggle */}
            <button
              onClick={onToggleSound}
              className={`min-h-[40px] min-w-[40px] p-2 rounded-full backdrop-blur-md transition-all active:scale-95 ${
                soundEnabled ? 'bg-black/50 text-white/80' : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
              }`}
              title="Toggle Shutter Audio"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Install to Phone Button */}
            <button
              onClick={onOpenInstall}
              className="min-h-[40px] px-2.5 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 backdrop-blur-md shadow-md active:scale-95 transition-all border border-red-400/40"
              title="Download / Install SchoolCam on Phone"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install App</span>
            </button>

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              className="min-h-[40px] min-w-[40px] p-2 rounded-full bg-black/50 text-white/80 hover:text-white backdrop-blur-md border border-white/10 active:scale-95 transition-all"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* LIVE GEO-TAG HUD BADGE */}
        <div className="absolute bottom-2 left-3 right-3 z-20 pointer-events-none">
          <div className="bg-slate-950/90 backdrop-blur-md border border-slate-700/60 rounded-xl p-3 shadow-2xl text-xs font-mono text-slate-300">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <div className="flex items-center gap-1.5 text-red-400 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span className="truncate max-w-[200px]">
                  {geoData.status === 'ready'
                    ? 'GPS LOCKED'
                    : geoData.status === 'acquiring'
                    ? 'FETCHING GPS...'
                    : 'GPS READY'}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">±{geoData.accuracy}m</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                <span>{getCardinalDirection(geoData.heading)}</span>
                {geoData.altitude !== null && <span>· {geoData.altitude}m</span>}
              </div>
            </div>

            <p className="text-sm font-sans text-white font-bold truncate mb-1">
              {geoData.formattedAddress || 'Fetching area location...'}
            </p>

            <div className="flex items-center justify-between text-xs text-slate-300 font-mono font-semibold">
              <span>{formatCoordinates(geoData.latitude, geoData.longitude, watermarkConfig.coordinateFormat)}</span>
              <span className="tabular-nums">
                {new Date(geoData.timestamp).toLocaleTimeString([], { hour12: false })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM THUMB ZONE: Upload, Gallery, Shutter, and Camera Flip */}
      <div className="w-full bg-slate-950 border-t border-slate-800/80 px-4 sm:px-6 py-4 pb-6 flex items-center justify-between z-30">
        {/* Upload Photo Button */}
        <button
          onClick={() => {
            soundService.triggerHaptic('click');
            fileInputRef.current?.click();
          }}
          className="relative min-h-[50px] min-w-[50px] w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center text-slate-300 hover:text-white hover:border-red-500 transition-all active:scale-95 shadow-md"
          title="Upload Photo to Stamp Geotags"
        >
          <Upload className="w-5 h-5 text-red-400" />
          <span className="text-[9px] font-bold text-slate-300 mt-0.5">Upload</span>
        </button>

        {/* Gallery Button */}
        <button
          onClick={onOpenGallery}
          className="relative min-h-[50px] min-w-[50px] w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center text-slate-300 hover:text-white hover:border-red-500 transition-all active:scale-95 shadow-md"
          title="Open SchoolCam Gallery"
        >
          <Layers className="w-5 h-5 text-slate-300" />
          {savedPhotosCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-red-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center shadow-lg">
              {savedPhotosCount > 99 ? '99+' : savedPhotosCount}
            </span>
          )}
          <span className="text-[9px] font-bold text-slate-300 mt-0.5">Gallery</span>
        </button>

        {/* PRIMARY CAPTURE SHUTTER BUTTON */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleCaptureClick}
            disabled={isShutterPressed}
            className={`relative min-h-[76px] min-w-[76px] w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-transform active:scale-90 ${
              isShutterPressed ? 'scale-90 border-red-500' : 'hover:scale-105'
            }`}
            title="Capture Photo"
          >
            <div
              className={`w-16 h-16 rounded-full transition-all duration-100 ${
                isShutterPressed ? 'bg-red-500 scale-90' : 'bg-white hover:bg-slate-100 shadow-[0_0_15px_rgba(255,255,255,0.3)]'
              }`}
            />
          </button>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mt-1">Capture</span>
        </div>

        {/* CAMERA FRONT / BACK FLIP BUTTON */}
        <button
          onClick={onToggleFacingMode}
          className="relative min-h-[50px] min-w-[50px] w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center text-slate-300 hover:text-white hover:border-red-500 transition-all active:scale-95 shadow-md group"
          title={`Switch Camera (Currently: ${facingMode === 'environment' ? 'Back Camera' : 'Front Selfie Camera'})`}
        >
          <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300 text-red-400" />
          <span className="text-[9px] font-bold text-slate-300 mt-0.5">
            {facingMode === 'environment' ? 'Back' : 'Front'}
          </span>
        </button>
      </div>
    </div>
  );
};
