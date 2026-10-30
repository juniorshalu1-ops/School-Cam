import { GeoData, WatermarkConfig } from '../types';
import { formatCoordinates, getCardinalDirection } from './geolocation';

// Cache app logo image for watermark stamping
let cachedAppLogo: HTMLImageElement | null = null;
function getAppLogo(): Promise<HTMLImageElement | null> {
  if (cachedAppLogo) return Promise.resolve(cachedAppLogo);
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      cachedAppLogo = img;
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = '/assets/aistudio/ic_launcher_c43f4821.png';
  });
}

/**
 * Composites high-resolution photo with extra-large, ultra-legible geotag watermark stamp
 * Guaranteed Red Watermark: "SchoolCam by Satyam" with App Icon
 */
export async function generateWatermarkedImage(
  imageSource: HTMLImageElement | HTMLCanvasElement,
  geoData: GeoData,
  note: string,
  config: WatermarkConfig
): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not create canvas 2D context');

  const width = imageSource.width;
  const height = imageSource.height;
  canvas.width = width;
  canvas.height = height;

  // 1. Draw base photo
  ctx.drawImage(imageSource, 0, 0, width, height);

  // 2. Responsive scale factor (Baseline 1080px, minimum 0.8)
  const scale = Math.max(0.8, width / 1080);

  const formattedCoords = formatCoordinates(geoData.latitude, geoData.longitude, config.coordinateFormat);
  const formattedDate = new Date(geoData.timestamp).toISOString().replace('T', ' ').substring(0, 19);
  const cardinal = getCardinalDirection(geoData.heading);
  const altitudeText = geoData.altitude !== null ? `${geoData.altitude}m` : 'N/A';
  const accuracyText = `±${geoData.accuracy}m`;
  const addressText = geoData.formattedAddress || 'Location unknown';

  const logoImg = await getAppLogo();

  ctx.save();

  if (config.layout === 'survey') {
    drawSurveyLayout(ctx, width, height, scale, {
      geoData,
      note,
      config,
      formattedCoords,
      formattedDate,
      cardinal,
      altitudeText,
      accuracyText,
      addressText,
      logoImg,
    });
  } else if (config.layout === 'minimal') {
    drawMinimalLayout(ctx, width, height, scale, {
      geoData,
      note,
      config,
      formattedCoords,
      formattedDate,
      cardinal,
      altitudeText,
      accuracyText,
      addressText,
      logoImg,
    });
  } else {
    // Default: 'standard'
    drawStandardLayout(ctx, width, height, scale, {
      geoData,
      note,
      config,
      formattedCoords,
      formattedDate,
      cardinal,
      altitudeText,
      accuracyText,
      addressText,
      logoImg,
    });
  }

  // 3. Guaranteed Red Corner Stamp Watermark: "SchoolCam by Satyam" on every photo
  drawRedSchoolCamWatermark(ctx, width, height, scale, config.position, logoImg);

  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.94);
}

interface DrawParams {
  geoData: GeoData;
  note: string;
  config: WatermarkConfig;
  formattedCoords: string;
  formattedDate: string;
  cardinal: string;
  altitudeText: string;
  accuracyText: string;
  addressText: string;
  logoImg: HTMLImageElement | null;
}

/**
 * Renders the prominent, extra-large RED watermark badge: "SchoolCam by Satyam" + Icon
 */
function drawRedSchoolCamWatermark(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scale: number,
  bannerPosition: 'top' | 'bottom',
  logoImg: HTMLImageElement | null
) {
  ctx.save();

  // Much larger, bold font for high visibility
  const fontSize = Math.round(26 * scale);
  ctx.font = `800 ${fontSize}px 'Plus Jakarta Sans', sans-serif`;

  const text = 'SchoolCam by Satyam';
  const textWidth = ctx.measureText(text).width;
  const paddingX = 18 * scale;
  const paddingY = 12 * scale;
  const iconSize = Math.round(44 * scale);
  const iconGap = logoImg ? 12 * scale : 0;
  const badgeW = (logoImg ? iconSize + iconGap : 0) + textWidth + paddingX * 2;
  const badgeH = Math.max(iconSize, fontSize) + paddingY * 2;

  // Place in the top-right corner if banner is bottom, or bottom-right if banner is top
  const x = w - badgeW - 24 * scale;
  const y = bannerPosition === 'bottom' ? 24 * scale : h - badgeH - 24 * scale;

  // High-contrast dark backdrop
  ctx.fillStyle = 'rgba(10, 15, 29, 0.9)';
  ctx.beginPath();
  const radius = 14 * scale;
  ctx.roundRect(x, y, badgeW, badgeH, radius);
  ctx.fill();

  // Solid bright red border
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3 * scale;
  ctx.stroke();

  let textStartX = x + paddingX;

  // Draw circular app icon if loaded
  if (logoImg) {
    const iconY = y + (badgeH - iconSize) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(textStartX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImg, textStartX, iconY, iconSize, iconSize);
    ctx.restore();

    // Red circle outline around icon
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.arc(textStartX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
    ctx.stroke();

    textStartX += iconSize + iconGap;
  }

  // Vibrant RED text with intense drop shadow for legibility
  ctx.fillStyle = '#ef4444'; // Bright Red
  ctx.shadowColor = 'rgba(0, 0, 0, 1)';
  ctx.shadowBlur = 8 * scale;
  ctx.shadowOffsetX = 2 * scale;
  ctx.shadowOffsetY = 2 * scale;
  ctx.fillText(text, textStartX, y + paddingY + fontSize * 0.9);

  ctx.restore();
}

function drawStandardLayout(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scale: number,
  p: DrawParams
) {
  const pad = 30 * scale;

  // EXTRA LARGE FONT SIZES so all data is very clear and visible
  const fontSizeTitle = Math.round(32 * scale); // "SchoolCam by Satyam"
  const fontSizeArea = Math.round(28 * scale);  // Area / Location
  const fontSizeCoords = Math.round(22 * scale); // Lang / Lati / Alt / Accuracy
  const fontSizeTime = Math.round(20 * scale);   // Date & Time
  const fontSizeNote = Math.round(24 * scale);   // Custom Note

  let linesCount = 2;
  if (p.config.includeAddress) linesCount++;
  if (p.config.includeCoordinates) linesCount++;
  if (p.config.includeNote && p.note.trim()) linesCount += 2;

  const bannerHeight = Math.max(220 * scale, (linesCount * 44 + 90) * scale);
  const yStart = p.config.position === 'top' ? 0 : h - bannerHeight;

  // Solid dark background for maximum readability (opacity 0.92)
  const grad = ctx.createLinearGradient(0, yStart, 0, yStart + bannerHeight);
  grad.addColorStop(0, `rgba(5, 9, 20, 0.94)`);
  grad.addColorStop(1, `rgba(10, 15, 29, 0.96)`);

  ctx.fillStyle = grad;
  ctx.fillRect(0, yStart, w, bannerHeight);

  // Bold Red Accent divider line
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  if (p.config.position === 'top') {
    ctx.moveTo(0, yStart + bannerHeight);
    ctx.lineTo(w, yStart + bannerHeight);
  } else {
    ctx.moveTo(0, yStart);
    ctx.lineTo(w, yStart);
  }
  ctx.stroke();

  // Compass badge on right
  const badgeSize = 100 * scale;
  const badgeX = w - pad - badgeSize;
  const badgeY = yStart + (bannerHeight - badgeSize) / 2;

  if (p.config.includeMiniMap) {
    drawCompassBadge(ctx, badgeX, badgeY, badgeSize, p.geoData.heading || 0, scale);
  }

  const textMaxW = p.config.includeMiniMap ? badgeX - pad * 1.5 : w - pad * 2;
  let curY = yStart + pad + fontSizeTitle * 0.9;

  // 1. APP ICON + LARGE RED WATERMARK HEADER: "SchoolCam by Satyam"
  const logoSize = Math.round(48 * scale);
  let titleX = pad;

  if (p.logoImg) {
    const logoY = curY - fontSizeTitle * 0.85;
    ctx.save();
    ctx.beginPath();
    ctx.arc(pad + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(p.logoImg, pad, logoY, logoSize, logoSize);
    ctx.restore();

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(pad + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.stroke();

    titleX = pad + logoSize + 14 * scale;
  }

  ctx.font = `800 ${fontSizeTitle}px 'Plus Jakarta Sans', sans-serif`;
  ctx.fillStyle = '#ef4444'; // Bright Red
  ctx.shadowColor = 'rgba(0,0,0,1)';
  ctx.shadowBlur = 6 * scale;
  ctx.shadowOffsetX = 2 * scale;
  ctx.shadowOffsetY = 2 * scale;
  ctx.fillText('SchoolCam by Satyam', titleX, curY);

  curY += fontSizeArea + 14 * scale;

  // 2. LARGE Area Name / Address (fetched by GPS)
  if (p.config.includeAddress) {
    ctx.font = `700 ${fontSizeArea}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 4 * scale;
    const truncatedAddress = truncateText(ctx, p.addressText, textMaxW);
    ctx.fillText(truncatedAddress, pad, curY);
    curY += fontSizeCoords + 12 * scale;
  }

  // 3. LARGE Geo Tags: Latitude, Longitude, Altitude, Accuracy, Bearing
  if (p.config.includeCoordinates || p.config.includeAltitude || p.config.includeCompass) {
    ctx.font = `600 ${fontSizeCoords}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = '#cbd5e1';

    const items: string[] = [];
    if (p.config.includeCoordinates) items.push(p.formattedCoords);
    if (p.config.includeAltitude) items.push(`Alt: ${p.altitudeText}`);
    if (p.config.includeAccuracy) items.push(`Acc: ${p.accuracyText}`);
    if (p.config.includeCompass) items.push(`Bearing: ${p.cardinal}`);

    const metaLine = truncateText(ctx, items.join('  |  '), textMaxW);
    ctx.fillText(metaLine, pad, curY);
    curY += fontSizeTime + 10 * scale;
  }

  // 4. LARGE Date & Time
  if (p.config.includeTimestamp) {
    ctx.font = `500 ${fontSizeTime}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = '#94a3b8';
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    ctx.fillText(`Date & Time: ${p.formattedDate} (${tz})`, pad, curY);
    curY += fontSizeNote + 12 * scale;
  }

  // 5. LARGE User Note (Clean note space, no preset filled work tags)
  if (p.config.includeNote && p.note.trim()) {
    curY += 4 * scale;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
    const noteBoxH = fontSizeNote + 20 * scale;
    ctx.fillRect(pad, curY - fontSizeNote * 0.9 - 6 * scale, textMaxW, noteBoxH);

    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 1.5 * scale;
    ctx.strokeRect(pad, curY - fontSizeNote * 0.9 - 6 * scale, textMaxW, noteBoxH);

    ctx.font = `800 ${fontSizeNote}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = '#ef4444'; // Red Note label
    ctx.fillText('NOTE:', pad + 14 * scale, curY);

    const notePrefixW = ctx.measureText('NOTE:').width + 12 * scale;
    ctx.font = `600 ${fontSizeNote}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = '#ffffff';
    const noteText = truncateText(ctx, p.note.trim(), textMaxW - notePrefixW - 20 * scale);
    ctx.fillText(noteText, pad + 14 * scale + notePrefixW, curY);
  }
}

function drawSurveyLayout(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scale: number,
  p: DrawParams
) {
  const pad = 24 * scale;
  const boxW = Math.min(w - pad * 2, 850 * scale);

  // Large sizes
  const titleSize = Math.round(28 * scale);
  const dataSize = Math.round(22 * scale);
  const noteSize = Math.round(22 * scale);

  const boxH = (p.note.trim() ? 270 : 210) * scale;
  const boxX = pad;
  const boxY = p.config.position === 'top' ? pad : h - pad - boxH;

  // Box background
  ctx.fillStyle = `rgba(10, 15, 29, 0.95)`;
  ctx.fillRect(boxX, boxY, boxW, boxH);

  // Bold Red Border
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3 * scale;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  const headerH = 50 * scale;
  ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
  ctx.fillRect(boxX, boxY, boxW, headerH);

  // RED Header: SchoolCam by Satyam
  ctx.font = `800 ${titleSize}px 'Plus Jakarta Sans', sans-serif`;
  ctx.fillStyle = '#ef4444';
  ctx.fillText('SchoolCam by Satyam', boxX + 20 * scale, boxY + 34 * scale);

  const dateStr = p.formattedDate;
  ctx.font = `600 ${18 * scale}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(dateStr, boxX + boxW - ctx.measureText(dateStr).width - 20 * scale, boxY + 34 * scale);

  // Grid Fields
  const rowY = boxY + headerH + 34 * scale;
  const col1X = boxX + 20 * scale;
  const col2X = boxX + boxW / 2;

  ctx.font = `700 ${dataSize}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = '#ef4444';
  ctx.fillText('AREA:', col1X, rowY);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(truncateText(ctx, p.addressText, boxW - 140 * scale), col1X + 90 * scale, rowY);

  ctx.font = `700 ${dataSize}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = '#ef4444';
  ctx.fillText('LAT/LONG:', col1X, rowY + 36 * scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(p.formattedCoords, col1X + 130 * scale, rowY + 36 * scale);

  ctx.fillStyle = '#ef4444';
  ctx.fillText('ELEVATION:', col1X, rowY + 70 * scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${p.altitudeText} (${p.accuracyText})`, col1X + 135 * scale, rowY + 70 * scale);

  ctx.fillStyle = '#ef4444';
  ctx.fillText('BEARING:', col2X, rowY + 70 * scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(p.cardinal, col2X + 110 * scale, rowY + 70 * scale);

  if (p.note.trim()) {
    const noteY = rowY + 112 * scale;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.beginPath();
    ctx.moveTo(col1X, noteY - 18 * scale);
    ctx.lineTo(boxX + boxW - 20 * scale, noteY - 18 * scale);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.fillText('NOTE:', col1X, noteY);
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 ${noteSize}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillText(truncateText(ctx, p.note.trim(), boxW - 130 * scale), col1X + 85 * scale, noteY);
  }
}

function drawMinimalLayout(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scale: number,
  p: DrawParams
) {
  const pad = 30 * scale;
  const fontSize = Math.round(24 * scale);
  let curY = p.config.position === 'top' ? pad + fontSize : h - pad;

  ctx.shadowColor = 'rgba(0, 0, 0, 1)';
  ctx.shadowBlur = 8 * scale;
  ctx.shadowOffsetX = 2 * scale;
  ctx.shadowOffsetY = 2 * scale;

  const lines: { text: string; color: string; font: string }[] = [];

  // Large Red Watermark
  lines.push({
    text: 'SchoolCam by Satyam',
    color: '#ef4444',
    font: `800 ${fontSize + 8 * scale}px 'Plus Jakarta Sans', sans-serif`,
  });

  if (p.config.includeNote && p.note.trim()) {
    lines.push({
      text: `Note: ${p.note.trim()}`,
      color: '#ffffff',
      font: `700 ${fontSize + 2 * scale}px 'Plus Jakarta Sans', sans-serif`,
    });
  }

  if (p.config.includeAddress) {
    lines.push({
      text: p.addressText,
      color: '#ffffff',
      font: `700 ${fontSize + 3 * scale}px 'Plus Jakarta Sans', sans-serif`,
    });
  }

  if (p.config.includeCoordinates) {
    lines.push({
      text: `${p.formattedCoords}  ·  ${p.altitudeText}  ·  ${p.cardinal}`,
      color: '#cbd5e1',
      font: `600 ${fontSize}px 'JetBrains Mono', monospace`,
    });
  }

  if (p.config.includeTimestamp) {
    lines.push({
      text: p.formattedDate,
      color: '#94a3b8',
      font: `500 ${fontSize - 2 * scale}px 'JetBrains Mono', monospace`,
    });
  }

  if (p.config.position === 'bottom') {
    lines.reverse();
    for (const item of lines) {
      ctx.font = item.font;
      ctx.fillStyle = item.color;
      ctx.fillText(truncateText(ctx, item.text, w - pad * 2), pad, curY);
      curY -= fontSize + 12 * scale;
    }
  } else {
    for (const item of lines) {
      ctx.font = item.font;
      ctx.fillStyle = item.color;
      ctx.fillText(truncateText(ctx, item.text, w - pad * 2), pad, curY);
      curY += fontSize + 12 * scale;
    }
  }
}

function drawCompassBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  headingDeg: number,
  scale: number
) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2 - 6 * scale;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2.5 * scale;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5 * scale;
  for (let a = 0; a < 360; a += 45) {
    const rad = (a * Math.PI) / 180;
    const x1 = cx + (r - 8 * scale) * Math.sin(rad);
    const y1 = cy - (r - 8 * scale) * Math.cos(rad);
    const x2 = cx + r * Math.sin(rad);
    const y2 = cy - r * Math.cos(rad);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  const needleRad = (headingDeg * Math.PI) / 180;
  const needleLen = r - 12 * scale;

  // North needle (red)
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + needleLen * Math.sin(needleRad), cy - needleLen * Math.cos(needleRad));
  ctx.lineTo(
    cx + 7 * scale * Math.sin(needleRad + Math.PI / 2),
    cy - 7 * scale * Math.cos(needleRad + Math.PI / 2)
  );
  ctx.closePath();
  ctx.fill();

  // South needle (white)
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx - needleLen * 0.7 * Math.sin(needleRad), cy + needleLen * 0.7 * Math.cos(needleRad));
  ctx.lineTo(
    cx + 6 * scale * Math.sin(needleRad - Math.PI / 2),
    cy - 6 * scale * Math.cos(needleRad - Math.PI / 2)
  );
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, 4 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `800 ${12 * scale}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = '#ef4444';
  ctx.textAlign = 'center';
  ctx.fillText('N', cx, cy - r + 13 * scale);
  ctx.textAlign = 'start';
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let truncated = text;
  while (truncated.length > 3 && ctx.measureText(truncated + '...').width > maxW) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}
