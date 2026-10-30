import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileArchive,
  HelpCircle,
  Package,
  QrCode,
  Share,
  Smartphone,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { soundService } from '../services/audio';

interface InstallModalProps {
  onClose: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({ onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, triggerInstall } = usePWAInstall();
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'apk' | 'android' | 'ios' | 'qr'>('apk');

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://ais-pre-op3gtfbk65njley5vgjdra-102943040951.asia-east1.run.app';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(
    currentUrl
  )}`;

  const handleCopyLink = () => {
    soundService.triggerHaptic('click');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleInstallClick = async () => {
    soundService.triggerHaptic('click');
    const success = await triggerInstall();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl flex flex-col max-h-[92vh] overflow-hidden shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/aistudio/ic_launcher_c43f4821.png"
              alt="SchoolCam App Icon"
              className="w-8 h-8 rounded-full border border-red-500 shadow-md object-cover"
            />
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">SchoolCam APK & Phone Install</h3>
              <p className="text-[11px] text-red-400 font-medium">Download Android APK or Install on Phone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Quick Direct 1-Click Install Button if supported */}
          {isInstallable && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-600/30 flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-200">
                1-Click Direct Phone Install (WebAPK)
              </span>
              <p className="text-xs text-white/90">
                Android automatically creates an official APK on your phone with the SchoolCam icon and drawer shortcut!
              </p>
              <button
                onClick={handleInstallClick}
                className="mt-1 w-full py-2.5 px-4 rounded-lg bg-white text-slate-950 text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-all active:scale-95 shadow-md"
              >
                <Download className="w-4 h-4 text-red-600" />
                <span>Install SchoolCam on Android Now</span>
              </button>
            </div>
          )}

          {/* Platform Tabs: APK File | Android | iPhone | Scan QR */}
          <div className="grid grid-cols-4 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setActiveTab('apk')}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                activeTab === 'apk'
                  ? 'bg-red-500 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>APK File</span>
            </button>
            <button
              onClick={() => setActiveTab('android')}
              className={`py-2 rounded-lg transition-all ${
                activeTab === 'android'
                  ? 'bg-red-500 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Android
            </button>
            <button
              onClick={() => setActiveTab('ios')}
              className={`py-2 rounded-lg transition-all ${
                activeTab === 'ios'
                  ? 'bg-red-500 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              iPhone
            </button>
            <button
              onClick={() => setActiveTab('qr')}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                activeTab === 'qr'
                  ? 'bg-red-500 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Code</span>
            </button>
          </div>

          {/* TAB 1: APK FILE DOWNLOAD (Offline ZIP + APK Converters) */}
          {activeTab === 'apk' && (
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">APK File Download Options (100% Working)</h4>
                  <p className="text-[11px] text-slate-400">Direct standalone package or free APK builder</p>
                </div>
              </div>

              {/* METHOD A: Direct Download Standalone Web Package ZIP */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-red-500/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wide">
                    Option 1: Download Complete App Package (.ZIP)
                  </span>
                  <span className="text-[10px] bg-red-500 text-white font-bold px-2 py-0.5 rounded">
                    1.5 MB
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Download the complete standalone build with all HTML, JS, CSS, and Bihar SchoolCam icons:
                </p>
                <a
                  href="/SchoolCam_App_Package.zip"
                  download="SchoolCam_App_Package.zip"
                  className="w-full py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Download SchoolCam_App_Package.zip</span>
                </a>
                <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
                  <span className="font-bold text-white block">How to turn this ZIP into an APK:</span>
                  <div><strong>1. Free Netlify Drop &rarr; PWABuilder:</strong> Drag this ZIP to <a href="https://app.netlify.com/drop" target="_blank" rel="noreferrer" className="text-sky-400 underline">app.netlify.com/drop</a> to get an instant public URL, then paste into PWABuilder to get the `.apk` without errors!</div>
                  <div><strong>2. Offline PC Software:</strong> Open in free <strong>"Website 2 APK Builder"</strong> software on PC &rarr; Click Generate APK!</div>
                </div>
              </div>

              {/* METHOD B: Free AppCreator24 */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700/80 space-y-2">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wide block">
                  Option 2: AppCreator24 (Mobile APK Maker)
                </span>
                <p className="text-xs text-slate-300">
                  Open <strong>appcreator24.com</strong> on your phone &rarr; Create App &rarr; Upload this ZIP file or HTML &rarr; it compiles and delivers your <code className="text-red-400">SchoolCam.apk</code> straight to your Android phone!
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Android Guide */}
          {activeTab === 'android' && (
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Install directly on Android (Chrome / Samsung):</span>
              </h4>
              <ol className="text-xs text-slate-300 space-y-2.5 pl-1">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-red-400 flex items-center justify-center font-bold text-[11px] shrink-0">1</span>
                  <span>Open this link in <strong>Google Chrome</strong> on your phone.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-red-400 flex items-center justify-center font-bold text-[11px] shrink-0">2</span>
                  <span>Tap the <strong>three dots (⋮)</strong> at the top right of Chrome.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-red-400 flex items-center justify-center font-bold text-[11px] shrink-0">3</span>
                  <span>Tap <strong>"Install app"</strong> (or <strong>"Add to Home screen"</strong>).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-red-400 flex items-center justify-center font-bold text-[11px] shrink-0">4</span>
                  <span>Tap <strong>Install</strong>. Android will build a native APK package on your phone!</span>
                </li>
              </ol>
            </div>
          )}

          {/* TAB 3: iPhone Guide */}
          {activeTab === 'ios' && (
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-sky-400" />
                <span>How to Install on iPhone (Safari):</span>
              </h4>
              <ol className="text-xs text-slate-300 space-y-2.5 pl-1">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-red-400 flex items-center justify-center font-bold text-[11px] shrink-0">1</span>
                  <span>Open this link in <strong>Safari</strong> on your iPhone.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-red-400 flex items-center justify-center font-bold text-[11px] shrink-0">2</span>
                  <span className="flex items-center gap-1">
                    Tap the <strong>Share</strong> button <Share className="w-3.5 h-3.5 text-sky-400 inline" /> at the bottom toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-red-400 flex items-center justify-center font-bold text-[11px] shrink-0">3</span>
                  <span>Scroll down and tap <strong>"Add to Home Screen"</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-red-400 flex items-center justify-center font-bold text-[11px] shrink-0">4</span>
                  <span>Tap <strong>Add</strong> in the top-right corner.</span>
                </li>
              </ol>
            </div>
          )}

          {/* TAB 4: QR Code */}
          {activeTab === 'qr' && (
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col items-center text-center">
              <div className="p-3 bg-white rounded-2xl shadow-xl mb-3">
                <img
                  src={qrCodeUrl}
                  alt="Scan to open SchoolCam on phone"
                  className="w-44 h-44 object-contain"
                />
              </div>
              <p className="text-xs text-slate-300 font-medium mb-1">
                Scan with your phone's camera
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs">
                Point your phone camera at this QR code to immediately open SchoolCam on your phone.
              </p>
            </div>
          )}

          {/* App URL and Copy Button */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400 truncate font-mono">
              {currentUrl}
            </span>
            <button
              onClick={handleCopyLink}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors ${
                copied
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
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
