import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Camera,
  Copy,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  Filter,
  Grid,
  Map,
  MapPin,
  Search,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import { CapturedPhoto } from '../types';
import { formatCoordinates } from '../services/geolocation';
import { soundService } from '../services/audio';

import L from 'leaflet';

interface GalleryViewProps {
  photos: CapturedPhoto[];
  onBackToCamera: () => void;
  onDeletePhoto: (id: string) => void;
  onUpdateNote: (id: string, newNote: string) => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({
  photos,
  onBackToCamera,
  onDeletePhoto,
  onUpdateNote,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);
  const [editedNote, setEditedNote] = useState<string>('');
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);

  const filteredPhotos = photos.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.note.toLowerCase().includes(q) ||
      p.geoData.formattedAddress.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (viewMode !== 'map' || !mapContainerRef.current) return;

    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const defaultLat = photos.length > 0 ? photos[0].geoData.latitude : 28.6139;
    const defaultLng = photos.length > 0 ? photos[0].geoData.longitude : 77.2090;

    const map = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], photos.length > 0 ? 13 : 4);
    leafletMapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const customIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="background-color: #ef4444; width: 32px; height: 32px; border-radius: 50%; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
          <div style="width: 10px; height: 10px; background-color: #ffffff; border-radius: 50%;"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });

    const markers: L.Marker[] = [];

    photos.forEach((photo) => {
      const marker = L.marker([photo.geoData.latitude, photo.geoData.longitude], {
        icon: customIcon,
      }).addTo(map);

      const popupContent = `
        <div style="min-width: 180px; max-width: 240px; padding: 4px;">
          <img src="${photo.watermarkedImageUrl}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 8px; margin-bottom: 6px;" />
          <div style="font-weight: 700; font-size: 11px; color: #ef4444; margin-bottom: 2px;">SchoolCam by Satyam</div>
          <div style="font-weight: 600; font-size: 12px; color: #f8fafc; margin-bottom: 4px; line-height: 1.2;">
            ${photo.geoData.formattedAddress || 'Location'}
          </div>
          <div style="font-size: 11px; color: #ef4444; font-family: monospace; margin-bottom: 4px;">
            ${formatCoordinates(photo.geoData.latitude, photo.geoData.longitude, 'decimal')}
          </div>
          ${photo.note ? `<div style="font-size: 11px; color: #cbd5e1; font-style: italic;">"${photo.note}"</div>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);
      markers.push(marker);
    });

    if (markers.length > 1) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [viewMode, photos]);

  const handleDownloadPhoto = (photo: CapturedPhoto) => {
    soundService.triggerHaptic('click');
    const link = document.createElement('a');
    link.href = photo.watermarkedImageUrl;
    link.download = `SchoolCam_${photo.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyCoords = (lat: number, lon: number) => {
    soundService.triggerHaptic('click');
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-950 flex flex-col overflow-hidden text-slate-100">
      {/* 1. TOP BAR */}
      <header className="w-full bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between z-10 shrink-0">
        <button
          onClick={onBackToCamera}
          className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all active:scale-95"
          title="Return to Camera"
        >
          <ArrowLeft className="w-4 h-4 text-red-500" />
          <span>Camera</span>
        </button>

        <div className="flex items-center gap-2">
          <img
            src="/assets/aistudio/ic_launcher_c43f4821.png"
            alt="SchoolCam App Icon"
            className="w-7 h-7 rounded-full border border-red-500 shadow-sm object-cover"
          />
          <span className="text-sm font-bold text-white">SchoolCam Gallery</span>
          <span className="text-xs text-red-400 font-mono">({photos.length})</span>
        </div>

        {/* View mode toggle tabs: Grid vs Map */}
        <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700">
          <button
            onClick={() => {
              soundService.triggerHaptic('click');
              setViewMode('grid');
            }}
            className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              viewMode === 'grid'
                ? 'bg-red-500 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            onClick={() => {
              soundService.triggerHaptic('click');
              setViewMode('map');
            }}
            className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              viewMode === 'map'
                ? 'bg-red-500 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Map</span>
          </button>
        </div>
      </header>

      {/* 2. SEARCH BAR */}
      <div className="w-full bg-slate-900/50 border-b border-slate-800/80 px-4 py-2.5 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes or location addresses..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-red-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4 max-w-7xl mx-auto w-full">
        {viewMode === 'map' ? (
          <div className="relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
            <div ref={mapContainerRef} className="w-full h-full" />
            {photos.length === 0 && (
              <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center p-6 text-center">
                <MapPin className="w-12 h-12 text-slate-600 mb-3" />
                <h4 className="text-base font-semibold text-white mb-1">No Geo-Tagged Photos Yet</h4>
                <p className="text-xs text-slate-400 max-w-xs mb-4">
                  Take photos using SchoolCam to plot them on the map.
                </p>
                <button
                  onClick={onBackToCamera}
                  className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-xl"
                >
                  Open Camera
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            {filteredPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4">
                  <Camera className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  {searchQuery ? 'No Matching Photos' : 'No Photos Saved Yet'}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mb-6">
                  {searchQuery
                    ? `No captures found matching "${searchQuery}".`
                    : 'Capture your first photo or upload one to stamp with "SchoolCam by Satyam", GPS coordinates, and notes.'}
                </p>
                <button
                  onClick={onBackToCamera}
                  className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-red-500/20"
                >
                  Open Camera
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => {
                      soundService.triggerHaptic('click');
                      setSelectedPhoto(photo);
                      setEditedNote(photo.note);
                      setIsEditingNote(false);
                    }}
                    className="group bg-slate-900/90 border border-slate-800 hover:border-red-500/60 rounded-2xl overflow-hidden shadow-lg transition-all hover:scale-[1.01] cursor-pointer flex flex-col"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-[4/3] w-full bg-black overflow-hidden">
                      <img
                        src={photo.watermarkedImageUrl}
                        alt="SchoolCam capture"
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold text-red-500 border border-red-500/30">
                        SchoolCam by Satyam
                      </div>
                      <div className="absolute top-2 right-2 bg-slate-950/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-slate-300 border border-white/10">
                        {new Date(photo.timestamp).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>

                    {/* Metadata Card Content */}
                    <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
                      <div>
                        {/* Note Highlight */}
                        {photo.note ? (
                          <p className="text-xs font-medium text-white line-clamp-2 mb-1.5">
                            "{photo.note}"
                          </p>
                        ) : (
                          <p className="text-xs text-slate-500 italic mb-1.5">No note added</p>
                        )}

                        {/* Address */}
                        <div className="flex items-start gap-1.5 text-xs text-slate-300 mb-1">
                          <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{photo.geoData.formattedAddress}</span>
                        </div>

                        {/* Coordinates */}
                        <div className="text-[11px] font-mono text-slate-400">
                          {formatCoordinates(photo.geoData.latitude, photo.geoData.longitude, 'decimal')}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                        <span className="font-mono text-[10px]">
                          {new Date(photo.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPhoto(photo);
                            }}
                            className="p-1 hover:text-white"
                            title="Download to Phone"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeletePhoto(photo.id);
                            }}
                            className="p-1 hover:text-rose-400"
                            title="Delete Photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. PHOTO DETAIL MODAL */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 overflow-hidden">
          <div className="relative w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <MapPin className="w-4 h-4 text-red-500" />
                <span>{selectedPhoto.geoData.formattedAddress}</span>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Photo Body */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              <div className="relative aspect-[4/3] w-full bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
                <img
                  src={selectedPhoto.watermarkedImageUrl}
                  alt="Full resolution SchoolCam capture"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Note Edit Section */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                    Note
                  </span>
                  {!isEditingNote ? (
                    <button
                      onClick={() => setIsEditingNote(true)}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit Note</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        onUpdateNote(selectedPhoto.id, editedNote);
                        setSelectedPhoto({ ...selectedPhoto, note: editedNote });
                        setIsEditingNote(false);
                      }}
                      className="text-xs text-red-400 hover:text-red-300 font-bold"
                    >
                      Save Note
                    </button>
                  )}
                </div>

                {isEditingNote ? (
                  <textarea
                    rows={2}
                    value={editedNote}
                    onChange={(e) => setEditedNote(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                ) : (
                  <p className="text-xs text-slate-200">
                    {selectedPhoto.note || <span className="text-slate-500 italic">No note assigned</span>}
                  </p>
                )}
              </div>

              {/* Geo Telemetry Table */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="bg-slate-950 border border-slate-800/80 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-500 block">LAT / LONG</span>
                  <span className="text-slate-200 text-[11px]">
                    {selectedPhoto.geoData.latitude.toFixed(5)}°, {selectedPhoto.geoData.longitude.toFixed(5)}°
                  </span>
                </div>
                <div className="bg-slate-950 border border-slate-800/80 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-500 block">ALTITUDE</span>
                  <span className="text-slate-200 text-[11px]">
                    {selectedPhoto.geoData.altitude !== null ? `${selectedPhoto.geoData.altitude}m` : 'N/A'}
                  </span>
                </div>
                <div className="bg-slate-950 border border-slate-800/80 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-500 block">ACCURACY</span>
                  <span className="text-emerald-400 text-[11px]">±{selectedPhoto.geoData.accuracy}m</span>
                </div>
                <div className="bg-slate-950 border border-slate-800/80 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-500 block">WATERMARK</span>
                  <span className="text-red-500 font-bold text-[11px]">SchoolCam by Satyam</span>
                </div>
              </div>
            </div>

            {/* Modal Action Footer */}
            <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    handleCopyCoords(selectedPhoto.geoData.latitude, selectedPhoto.geoData.longitude)
                  }
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copyFeedback ? 'Copied!' : 'Copy GPS'}</span>
                </button>
                <a
                  href={`https://www.google.com/maps?q=${selectedPhoto.geoData.latitude},${selectedPhoto.geoData.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Google Maps</span>
                </a>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onDeletePhoto(selectedPhoto.id);
                    setSelectedPhoto(null);
                  }}
                  className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
                <button
                  onClick={() => handleDownloadPhoto(selectedPhoto)}
                  className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-red-500/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download to Phone</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
