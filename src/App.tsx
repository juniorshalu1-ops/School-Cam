import React, { useEffect, useState } from 'react';
import { AppSettings, CapturedPhoto, FacingMode, FlashMode, GeoData } from './types';
import { geoTracker } from './services/geolocation';
import {
  DEFAULT_SETTINGS,
  deletePhoto,
  getAllPhotos,
  getSettings,
  savePhoto,
  saveSettings,
  updatePhotoNote,
} from './services/storage';
import { CameraView } from './components/CameraView';
import { ReviewModal } from './components/ReviewModal';
import { GalleryView } from './components/GalleryView';
import { SettingsModal } from './components/SettingsModal';
import { InstallModal } from './components/InstallModal';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'camera' | 'gallery'>('camera');
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [reviewCanvas, setReviewCanvas] = useState<HTMLCanvasElement | null>(null);
  const [capturedGeoData, setCapturedGeoData] = useState<GeoData | null>(null);
  const [capturedFacingMode, setCapturedFacingMode] = useState<FacingMode>('environment');

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isInstallOpen, setIsInstallOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [geoData, setGeoData] = useState<GeoData>({
    latitude: 28.6139,
    longitude: 77.2090,
    altitude: 18,
    accuracy: 5,
    heading: 45,
    speed: null,
    timestamp: Date.now(),
    formattedAddress: 'Fetching Area Location...',
    status: 'idle',
  });

  // 1. Initialize GPS tracker and load stored photos & settings
  useEffect(() => {
    geoTracker.start();
    const unsubscribe = geoTracker.subscribe((data) => {
      setGeoData(data);
    });

    getSettings().then((loadedSettings) => {
      setSettings(loadedSettings);
    });

    getAllPhotos().then((loadedPhotos) => {
      setPhotos(loadedPhotos);
    });

    return () => {
      unsubscribe();
      geoTracker.stop();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleCycleFlashMode = () => {
    setFlashMode((prev) => {
      if (prev === 'off') return 'on';
      if (prev === 'on') return 'torch';
      return 'off';
    });
  };

  const handleCapture = (capturedCanvas: HTMLCanvasElement) => {
    const snapshot = geoTracker.getSnapshot();
    setCapturedGeoData(snapshot);
    setCapturedFacingMode(facingMode);
    setReviewCanvas(capturedCanvas);
  };

  const handleRetake = () => {
    setReviewCanvas(null);
    setCapturedGeoData(null);
  };

  const handleSavePhoto = async (newPhoto: CapturedPhoto) => {
    try {
      await savePhoto(newPhoto);
      setPhotos((prev) => [newPhoto, ...prev]);
      setReviewCanvas(null);
      setCapturedGeoData(null);
      showToast('Photo saved to phone & SchoolCam gallery!');
    } catch (e) {
      console.error('Failed to persist photo:', e);
      setReviewCanvas(null);
      showToast('Photo downloaded to phone!');
    }
  };

  const handleDeletePhoto = async (id: string) => {
    try {
      await deletePhoto(id);
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      showToast('Photo removed from SchoolCam gallery');
    } catch (e) {
      console.error('Failed to delete photo:', e);
    }
  };

  const handleUpdateNote = async (id: string, newNote: string) => {
    try {
      await updatePhotoNote(id, newNote);
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, note: newNote } : p))
      );
      showToast('Note updated');
    } catch (e) {
      console.error('Failed to update note:', e);
    }
  };

  const handleClearGallery = async () => {
    for (const p of photos) {
      await deletePhoto(p.id);
    }
    setPhotos([]);
    showToast('All photos cleared');
  };

  const handleSaveSettings = (updated: AppSettings) => {
    setSettings(updated);
    saveSettings(updated);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-slate-100 flex flex-col font-sans">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Viewport: Camera or Gallery */}
      {currentView === 'camera' ? (
        <CameraView
          geoData={geoData}
          facingMode={facingMode}
          flashMode={flashMode}
          watermarkConfig={settings.watermarkConfig}
          gridEnabled={settings.gridEnabled}
          levelEnabled={settings.levelEnabled}
          soundEnabled={settings.soundEnabled}
          onToggleFacingMode={handleToggleFacingMode}
          onCycleFlashMode={handleCycleFlashMode}
          onToggleGrid={() =>
            handleSaveSettings({ ...settings, gridEnabled: !settings.gridEnabled })
          }
          onToggleLevel={() =>
            handleSaveSettings({ ...settings, levelEnabled: !settings.levelEnabled })
          }
          onToggleSound={() =>
            handleSaveSettings({ ...settings, soundEnabled: !settings.soundEnabled })
          }
          onOpenGallery={() => setCurrentView('gallery')}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenInstall={() => setIsInstallOpen(true)}
          onCapture={handleCapture}
          savedPhotosCount={photos.length}
        />
      ) : (
        <GalleryView
          photos={photos}
          onBackToCamera={() => setCurrentView('camera')}
          onDeletePhoto={handleDeletePhoto}
          onUpdateNote={handleUpdateNote}
        />
      )}

      {/* Captured Photo Review & Note Modal */}
      {reviewCanvas && capturedGeoData && (
        <ReviewModal
          rawCanvas={reviewCanvas}
          geoData={capturedGeoData}
          facingMode={capturedFacingMode}
          initialWatermarkConfig={settings.watermarkConfig}
          onRetake={handleRetake}
          onSave={handleSavePhoto}
        />
      )}

      {/* App Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onClose={() => setIsSettingsOpen(false)}
          onClearGallery={handleClearGallery}
          onOpenInstall={() => setIsInstallOpen(true)}
        />
      )}

      {/* Install App on Phone Modal */}
      {isInstallOpen && (
        <InstallModal onClose={() => setIsInstallOpen(false)} />
      )}
    </div>
  );
}
