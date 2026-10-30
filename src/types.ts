export type FlashMode = 'off' | 'on' | 'torch';

export type FacingMode = 'user' | 'environment';

export type CoordinateFormat = 'decimal' | 'dms';

export type WatermarkLayout = 'standard' | 'minimal' | 'survey';

export interface GeoAddress {
  road?: string;
  suburb?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
  displayName: string;
}

export interface GeoData {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  address?: GeoAddress;
  formattedAddress: string;
  status: 'idle' | 'acquiring' | 'ready' | 'error' | 'simulated';
  errorMessage?: string;
}

export interface WatermarkConfig {
  layout: WatermarkLayout;
  position: 'bottom' | 'top';
  includeNote: boolean;
  includeAddress: boolean;
  includeCoordinates: boolean;
  includeAltitude: boolean;
  includeAccuracy: boolean;
  includeTimestamp: boolean;
  includeCompass: boolean;
  includeMiniMap: boolean;
  coordinateFormat: CoordinateFormat;
  customPrefix?: string;
  bannerOpacity: number;
}

export interface CapturedPhoto {
  id: string;
  rawImageUrl: string;
  watermarkedImageUrl: string;
  geoData: GeoData;
  note: string;
  tags?: string[];
  createdAt: string;
  timestamp: number;
  facingMode: FacingMode;
  width: number;
  height: number;
}

export interface AppSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  gridEnabled: boolean;
  levelEnabled: boolean;
  highQualityCapture: boolean;
  watermarkConfig: WatermarkConfig;
}
