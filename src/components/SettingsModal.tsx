import React, { useState } from 'react';
import {
  Compass,
  Download,
  MapPin,
  Sliders,
  Smartphone,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AppSettings, CoordinateFormat } from '../types';
import { soundService } from '../services/audio';

interface SettingsModalProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onClose: () => void;
  onClearGallery: () => void;
  onOpenInstall: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSaveSettings,
  onClose,
  onClearGallery,
  onOpenInstall,
}) => {
  const [current, setCurrent] = useState<AppSettings>(settings);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  const handleUpdate = (updated: Partial<AppSettings>) => {
    const next = { ...current, ...updated };
    setCurrent(next);
    onSaveSettings(next);
  };

  const handleWatermarkUpdate = (updated: Partial<AppSettings['watermarkConfig']>) => {
    const next = {
      ...current,
      watermarkConfig: { ...current.watermarkConfig, ...updated },
    };
    setCurrent(next);
    onSaveSettings(next);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/aistudio/ic_launcher_c43f4821.png"
              alt="SchoolCam App Icon"
              className="w-7 h-7 rounded-full border border-red-500 shadow-sm object-cover"
            />
            <h3 className="text-sm font-bold text-white">SchoolCam Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Install to Phone Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-red-600/90 to-rose-700/90 text-white shadow-lg flex items-center justify-between gap-3 border border-red-500/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Download App to Phone</span>
                <span className="text-[11px] text-red-100">Add icon to home screen for 1-tap access</span>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenInstall();
              }}
              className="px-3.5 py-2 rounded-lg bg-white text-slate-950 text-xs font-bold shrink-0 hover:bg-slate-100 transition-all active:scale-95 shadow-md flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-red-600" />
              <span>Install</span>
            </button>
          </div>

          {/* Section 1: Watermark & Coordinates */}
          <div>
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3">
              Geotag Stamp & Coordinates
            </h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1.5">Stamp Watermark Title</label>
                <input
                  type="text"
                  value={current.watermarkConfig.customPrefix || 'SchoolCam by Satyam'}
                  onChange={(e) => handleWatermarkUpdate({ customPrefix: e.target.value })}
                  placeholder="SchoolCam by Satyam"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-red-400 font-bold focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1.5">Coordinates Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleWatermarkUpdate({ coordinateFormat: 'decimal' })}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all ${
                      current.watermarkConfig.coordinateFormat === 'decimal'
                        ? 'bg-red-500/20 text-red-400 border-red-500 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Decimal (37.7749° N)
                  </button>
                  <button
                    onClick={() => handleWatermarkUpdate({ coordinateFormat: 'dms' })}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all ${
                      current.watermarkConfig.coordinateFormat === 'dms'
                        ? 'bg-red-500/20 text-red-400 border-red-500 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    DMS (37° 46' 29" N)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Camera Feedback & Sound */}
          <div className="pt-4 border-t border-slate-800/80">
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3">
              Shutter Audio & Haptics
            </h4>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer">
                <div>
                  <span className="text-xs font-medium text-slate-200 block">Shutter Sound</span>
                  <span className="text-[11px] text-slate-400">Mechanical camera click upon photo capture</span>
                </div>
                <input
                  type="checkbox"
                  checked={current.soundEnabled}
                  onChange={(e) => {
                    handleUpdate({ soundEnabled: e.target.checked });
                    if (e.target.checked) soundService.playShutterSound(true);
                  }}
                  className="rounded bg-slate-800 border-slate-700 text-red-500 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer">
                <div>
                  <span className="text-xs font-medium text-slate-200 block">Haptic Vibration</span>
                  <span className="text-[11px] text-slate-400">Tactile buzz on shutter press and save</span>
                </div>
                <input
                  type="checkbox"
                  checked={current.hapticsEnabled}
                  onChange={(e) => handleUpdate({ hapticsEnabled: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-red-500 focus:ring-0"
                />
              </label>
            </div>
          </div>

          {/* Section 3: Data & Reset */}
          <div className="pt-4 border-t border-slate-800/80">
            <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">
              Storage Management
            </h4>
            <p className="text-xs text-slate-400 mb-3">
              Clear all captured photos stored locally in SchoolCam.
            </p>
            {confirmClear ? (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onClearGallery();
                    setConfirmClear(false);
                    onClose();
                  }}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                >
                  Confirm Delete All Photos
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2 border border-rose-500/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Saved Photos</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
