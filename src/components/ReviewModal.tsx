import React, { useEffect, useState, useTransition } from 'react';
import {
  Check,
  Compass,
  Download,
  Edit3,
  MapPin,
  RefreshCw,
  Save,
  Share2,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { CapturedPhoto, FacingMode, GeoData, WatermarkConfig } from '../types';
import { generateWatermarkedImage } from '../services/watermark';
import { formatCoordinates, getCardinalDirection } from '../services/geolocation';
import { soundService } from '../services/audio';

interface ReviewModalProps {
  rawCanvas: HTMLCanvasElement;
  geoData: GeoData;
  facingMode: FacingMode;
  initialWatermarkConfig: WatermarkConfig;
  onRetake: () => void;
  onSave: (photo: CapturedPhoto, saveToPhoneSuccess: boolean) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  rawCanvas,
  geoData,
  facingMode,
  initialWatermarkConfig,
  onRetake,
  onSave,
}) => {
  const [note, setNote] = useState<string>('');
  const [config, setConfig] = useState<WatermarkConfig>(initialWatermarkConfig);
  const [watermarkedUrl, setWatermarkedUrl] = useState<string>('');
  const [rawImageUrl, setRawImageUrl] = useState<string>('');
  const [isCompositing, setIsCompositing] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showConfigDrawer, setShowConfigDrawer] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  // Initialize raw image URL once
  useEffect(() => {
    const rawUrl = rawCanvas.toDataURL('image/jpeg', 0.95);
    setRawImageUrl(rawUrl);
  }, [rawCanvas]);

  // Re-composite whenever note or watermark config changes
  useEffect(() => {
    let active = true;
    setIsCompositing(true);

    const timer = setTimeout(async () => {
      try {
        const resultUrl = await generateWatermarkedImage(rawCanvas, geoData, note.trim(), config);
        if (active) {
          startTransition(() => {
            setWatermarkedUrl(resultUrl);
            setIsCompositing(false);
          });
        }
      } catch (err) {
        console.error('Error generating watermarked image:', err);
        if (active) setIsCompositing(false);
      }
    }, 80);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [note, config, rawCanvas, geoData]);

  // Build clean filename for download / phone saving
  const getExportFilename = () => {
    const now = new Date(geoData.timestamp);
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const sanitizedNote = note
      .trim()
      .slice(0, 24)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    return `SchoolCam_${dateStr}_${timeStr}${sanitizedNote ? `_${sanitizedNote}` : ''}.jpg`;
  };

  // Convert base64 dataUrl to File object for Web Share API
  const dataUrlToFile = async (url: string, filename: string): Promise<File> => {
    const res = await fetch(url);
    const blob = await res.blob();
    return new File([blob], filename, { type: 'image/jpeg' });
  };

  // Trigger browser download to device storage
  const triggerBrowserDownload = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SAVE BUTTON ACTION (Save in phone via Share or Direct Download, plus App DB)
  const handleSaveToPhone = async () => {
    setIsSaving(true);
    soundService.triggerHaptic('success');
    soundService.playBeep(880, 0.1);

    const filename = getExportFilename();
    const finalNote = note.trim();

    const newPhoto: CapturedPhoto = {
      id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      rawImageUrl: rawImageUrl || watermarkedUrl,
      watermarkedImageUrl: watermarkedUrl,
      geoData,
      note: finalNote,
      createdAt: new Date().toISOString(),
      timestamp: geoData.timestamp,
      facingMode,
      width: rawCanvas.width,
      height: rawCanvas.height,
    };

    let shareSucceeded = false;

    // 1. Try Native Web Share API if available (iOS Safari / Android Chrome to save directly to Photos)
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      try {
        const file = await dataUrlToFile(watermarkedUrl, filename);
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'SchoolCam Photo',
            text: `SchoolCam by Satyam - ${geoData.formattedAddress}. ${finalNote ? `Note: ${finalNote}` : ''}`,
            files: [file],
          });
          shareSucceeded = true;
        }
      } catch (err) {
        console.warn('Native share canceled or not supported:', err);
      }
    }

    // 2. Also trigger standard download so file is reliably saved to device Downloads/Photos folder
    if (!shareSucceeded) {
      triggerBrowserDownload(watermarkedUrl, filename);
    }

    setIsSaving(false);
    onSave(newPhoto, true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden text-slate-100">
      {/* 1. TOP HEADER (Retake & Actions) */}
      <header className="w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between z-20">
        {/* RETAKE BUTTON */}
        <button
          onClick={() => {
            soundService.triggerHaptic('click');
            onRetake();
          }}
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 border border-slate-700"
          title="Discard and Retake Photo"
        >
          <RefreshCw className="w-4 h-4 text-rose-400" />
          <span>Retake</span>
        </button>

        {/* Title & Red Watermark Indicator with App Icon */}
        <div className="flex items-center gap-2">
          <img
            src="/assets/aistudio/ic_launcher_c43f4821.png"
            alt="SchoolCam App Icon"
            className="w-8 h-8 rounded-full border border-red-500 shadow-md object-cover"
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white tracking-wide">Photo Preview</span>
            <span className="text-[10px] font-bold text-red-500 leading-tight">SchoolCam by Satyam</span>
          </div>
        </div>

        {/* Watermark layout settings drawer trigger */}
        <button
          onClick={() => setShowConfigDrawer(!showConfigDrawer)}
          className={`min-h-[44px] min-w-[44px] p-2 rounded-xl border transition-all active:scale-95 ${
            showConfigDrawer
              ? 'bg-red-500 text-white border-red-400 font-bold shadow-lg shadow-red-500/20'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
          title="Customize Watermark Stamp"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </header>

      {/* 2. MAIN PREVIEW & NOTE WORKSPACE */}
      <div className="flex-1 overflow-y-auto flex flex-col p-4 max-w-4xl mx-auto w-full gap-4">
        {/* PHOTO PREVIEW CONTAINER */}
        <div className="relative w-full aspect-[4/3] md:aspect-[16/10] bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
          {watermarkedUrl ? (
            <img
              src={watermarkedUrl}
              alt="SchoolCam geo-tagged capture"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin text-red-500" />
              <span className="text-xs font-mono">Applying SchoolCam geotags...</span>
            </div>
          )}

          {isCompositing && (
            <div className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-[11px] text-red-400 font-mono border border-red-500/40 flex items-center gap-2 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>Updating Stamp...</span>
            </div>
          )}
        </div>

        {/* WATERMARK STAMP CONFIGURATION DRAWER (Optional) */}
        {showConfigDrawer && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                Watermark Style & Details
              </span>
              <button
                onClick={() => setShowConfigDrawer(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Done
              </button>
            </div>

            {/* Layout Presets */}
            <div className="grid grid-cols-3 gap-2">
              {(['standard', 'survey', 'minimal'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => setConfig({ ...config, layout: style })}
                  className={`py-2 px-3 rounded-xl text-xs font-medium capitalize border transition-all ${
                    config.layout === style
                      ? 'bg-red-500/20 text-red-400 border-red-500 font-bold'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {style === 'standard' ? 'Standard Banner' : style === 'survey' ? 'Survey Grid' : 'Minimal Corner'}
                </button>
              ))}
            </div>

            {/* Position */}
            <div className="flex items-center justify-between text-xs py-1 border-t border-slate-800/60">
              <span className="text-slate-300 font-medium">Stamp Position</span>
              <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                <button
                  onClick={() => setConfig({ ...config, position: 'bottom' })}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    config.position === 'bottom' ? 'bg-red-500 text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  Bottom
                </button>
                <button
                  onClick={() => setConfig({ ...config, position: 'top' })}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    config.position === 'top' ? 'bg-red-500 text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  Top
                </button>
              </div>
            </div>

            {/* Element Toggles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-slate-800/60">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={config.includeAddress}
                  onChange={(e) => setConfig({ ...config, includeAddress: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-red-500 focus:ring-0"
                />
                <span>Area Name</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={config.includeCoordinates}
                  onChange={(e) => setConfig({ ...config, includeCoordinates: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-red-500 focus:ring-0"
                />
                <span>Lang / Lati</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={config.includeTimestamp}
                  onChange={(e) => setConfig({ ...config, includeTimestamp: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-red-500 focus:ring-0"
                />
                <span>Date & Time</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={config.includeMiniMap}
                  onChange={(e) => setConfig({ ...config, includeMiniMap: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-red-500 focus:ring-0"
                />
                <span>Compass Rose</span>
              </label>
            </div>
          </div>
        )}

        {/* 3. NOTE OPTION SECTION (Clean space for Note only — no preset tags / no filled work) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label htmlFor="photo-note" className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5" />
              <span>Note (Will be stamped on photo & saved)</span>
            </label>
            {note.trim() && (
              <span className="text-[11px] text-slate-400 font-mono">
                {note.length}/200 chars
              </span>
            )}
          </div>

          {/* Dedicated Clean Space for Note Only */}
          <textarea
            id="photo-note"
            rows={3}
            value={note}
            maxLength={200}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write your note here... (e.g. Science Class Experiment, Campus Field Activity, Annual Sports Day, Attendance Verification)"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none transition-all"
          />

          {/* GPS Auto-Fetched Telemetry Summary */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-400">
            <div className="flex items-center gap-1 text-slate-200 font-medium">
              <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="truncate max-w-[280px]">{geoData.formattedAddress}</span>
            </div>
            <span>·</span>
            <span className="font-mono text-slate-300">
              {formatCoordinates(geoData.latitude, geoData.longitude, config.coordinateFormat)}
            </span>
            <span>·</span>
            <span className="font-mono text-slate-400">
              {new Date(geoData.timestamp).toLocaleTimeString([], { hour12: false })}
            </span>
            <span>·</span>
            <span className="font-mono text-emerald-400">±{geoData.accuracy}m</span>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM ACTION ZONE (SAVE BUTTON & RETAKE BUTTON) */}
      <footer className="w-full bg-slate-900 border-t border-slate-800 px-6 py-4 flex items-center gap-3 z-20">
        {/* RETAKE BUTTON */}
        <button
          onClick={() => {
            soundService.triggerHaptic('click');
            onRetake();
          }}
          disabled={isSaving}
          className="min-h-[48px] px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 border border-slate-700 shrink-0"
          title="Retake photo"
        >
          <RefreshCw className="w-4 h-4 text-rose-400" />
          <span>Retake</span>
        </button>

        {/* PRIMARY SAVE BUTTON */}
        <button
          onClick={handleSaveToPhone}
          disabled={isSaving || isCompositing || !watermarkedUrl}
          className={`flex-1 min-h-[48px] px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
            isSaving || isCompositing || !watermarkedUrl
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
          }`}
          title="Save Photo to Phone & SchoolCam Gallery"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Saving to Phone...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Save Photo to Phone</span>
            </>
          )}
        </button>
      </footer>
    </div>
  );
};
