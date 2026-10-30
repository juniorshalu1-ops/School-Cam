import { GeoAddress, GeoData } from '../types';

export function decimalToDMS(decimal: number, isLatitude: boolean): string {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(2);

  let direction = '';
  if (isLatitude) {
    direction = decimal >= 0 ? 'N' : 'S';
  } else {
    direction = decimal >= 0 ? 'E' : 'W';
  }

  return `${degrees}°${minutes}'${seconds}" ${direction}`;
}

export function formatCoordinates(lat: number, lon: number, format: 'decimal' | 'dms' = 'decimal'): string {
  if (format === 'dms') {
    return `${decimalToDMS(lat, true)} ${decimalToDMS(lon, false)}`;
  }
  const latStr = `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(5)}° ${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lonStr}`;
}

export function getCardinalDirection(heading: number | null): string {
  if (heading === null || isNaN(heading)) return 'N/A';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const normalized = ((heading % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return `${directions[index]} ${Math.round(normalized)}°`;
}

// In-memory cache for reverse geocoding to prevent repeat requests
const geocodeCache = new Map<string, { address: GeoAddress; timestamp: number }>();
let lastGeocodeRequestTime = 0;

export async function fetchAddressFromCoordinates(lat: number, lon: number): Promise<GeoAddress> {
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = geocodeCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < 300000) {
    return cached.address;
  }

  // Throttle Nominatim to 1 request per second max per policy
  const timeSinceLast = now - lastGeocodeRequestTime;
  if (timeSinceLast < 1000) {
    await new Promise((r) => setTimeout(r, 1000 - timeSinceLast));
  }
  lastGeocodeRequestTime = Date.now();

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GeoSnap-Camera-App/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoding HTTP error: ${response.status}`);
    }

    const data = await response.json();
    const addr = data.address || {};

    const street = addr.road || addr.pedestrian || addr.footway || addr.cycleway || '';
    const suburb = addr.suburb || addr.neighbourhood || addr.quarter || '';
    const city = addr.city || addr.town || addr.village || addr.county || '';
    const state = addr.state || addr.province || '';
    const country = addr.country || '';
    const postcode = addr.postcode || '';

    const parts = [street, suburb, city, state, country].filter(Boolean);
    const displayName = parts.length > 0 ? parts.join(', ') : data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

    const result: GeoAddress = {
      road: street,
      suburb,
      city,
      state,
      country,
      postcode,
      displayName,
    };

    geocodeCache.set(cacheKey, { address: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.warn('Reverse geocoding fetch failed or offline:', error);
    return {
      displayName: `${lat.toFixed(5)}°, ${lon.toFixed(5)}°`,
    };
  }
}

export class GeoLocationTracker {
  private watchId: number | null = null;
  private currentGeoData: GeoData;
  private listeners: Set<(geo: GeoData) => void> = new Set();
  private orientationListener: ((e: DeviceOrientationEvent) => void) | null = null;
  private simulatedInterval: number | null = null;

  constructor() {
    this.currentGeoData = {
      latitude: 37.7749,
      longitude: -122.4194,
      altitude: 16,
      accuracy: 5,
      heading: 42,
      speed: null,
      timestamp: Date.now(),
      formattedAddress: 'San Francisco, California, United States',
      status: 'idle',
    };
  }

  public subscribe(callback: (geo: GeoData) => void): () => void {
    this.listeners.add(callback);
    callback(this.currentGeoData);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.currentGeoData);
    }
  }

  public start() {
    this.initCompass();

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.fallbackToSimulation('Geolocation not supported on this device');
      return;
    }

    this.currentGeoData = {
      ...this.currentGeoData,
      status: 'acquiring',
    };
    this.notify();

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 2000,
    };

    this.watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, altitude, accuracy, heading, speed } = pos.coords;

        const effectiveHeading = heading !== null && !isNaN(heading) 
          ? heading 
          : this.currentGeoData.heading;

        const prevLat = this.currentGeoData.latitude;
        const prevLon = this.currentGeoData.longitude;
        const distanceMoved = Math.hypot(latitude - prevLat, longitude - prevLon);

        let address = this.currentGeoData.address;
        let formattedAddress = this.currentGeoData.formattedAddress;

        // If newly acquired or moved notably, refresh reverse geocode
        if (!address || distanceMoved > 0.0005 || this.currentGeoData.status !== 'ready') {
          try {
            address = await fetchAddressFromCoordinates(latitude, longitude);
            formattedAddress = address.displayName;
          } catch {
            formattedAddress = `${latitude.toFixed(5)}°, ${longitude.toFixed(5)}°`;
          }
        }

        this.currentGeoData = {
          latitude,
          longitude,
          altitude: altitude !== null ? Math.round(altitude) : null,
          accuracy: Math.round(accuracy),
          heading: effectiveHeading,
          speed: speed !== null ? Math.round(speed * 3.6) : null, // km/h
          timestamp: pos.timestamp || Date.now(),
          address,
          formattedAddress,
          status: 'ready',
        };
        this.notify();
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        this.fallbackToSimulation(err.message);
      },
      options
    );
  }

  private initCompass() {
    if (typeof window === 'undefined' || !window.DeviceOrientationEvent) return;

    this.orientationListener = (e: DeviceOrientationEvent) => {
      let compassHeading: number | null = null;
      // iOS webkitCompassHeading
      const iosEvent = e as unknown as { webkitCompassHeading?: number };
      if (typeof iosEvent.webkitCompassHeading === 'number') {
        compassHeading = iosEvent.webkitCompassHeading;
      } else if (e.alpha !== null) {
        compassHeading = 360 - e.alpha;
      }

      if (compassHeading !== null) {
        this.currentGeoData = {
          ...this.currentGeoData,
          heading: Math.round(compassHeading),
        };
        this.notify();
      }
    };

    window.addEventListener('deviceorientation', this.orientationListener, true);
  }

  private fallbackToSimulation(reason: string) {
    if (this.currentGeoData.status === 'ready') return;

    this.currentGeoData = {
      ...this.currentGeoData,
      status: 'simulated',
      errorMessage: reason,
      formattedAddress: 'San Francisco, CA (Simulated GPS)',
    };
    this.notify();

    // Subtle drift simulation so coordinates look organic
    if (!this.simulatedInterval) {
      this.simulatedInterval = window.setInterval(() => {
        if (this.currentGeoData.status !== 'simulated') return;
        const driftLat = (Math.random() - 0.5) * 0.00004;
        const driftLon = (Math.random() - 0.5) * 0.00004;
        this.currentGeoData = {
          ...this.currentGeoData,
          latitude: this.currentGeoData.latitude + driftLat,
          longitude: this.currentGeoData.longitude + driftLon,
          timestamp: Date.now(),
        };
        this.notify();
      }, 4000);
    }
  }

  public getSnapshot(): GeoData {
    return { ...this.currentGeoData, timestamp: Date.now() };
  }

  public stop() {
    if (this.watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.orientationListener && typeof window !== 'undefined') {
      window.removeEventListener('deviceorientation', this.orientationListener);
      this.orientationListener = null;
    }
    if (this.simulatedInterval) {
      clearInterval(this.simulatedInterval);
      this.simulatedInterval = null;
    }
  }
}

export const geoTracker = new GeoLocationTracker();
