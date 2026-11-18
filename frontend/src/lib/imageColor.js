import { useEffect, useState } from "react";

/* Reads a thumbnail's lower half and returns that colour as "r g b", pushed toward a
   saturated, dark enough scrim so white text stays readable on any photo. Results are
   cached per source, so a catalog redraw does not re-sample images. */

const cache = new Map();
const paletteCache = new Map();

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };
  return [channel(h + 1 / 3) * 255, channel(h) * 255, channel(h - 1 / 3) * 255];
}

function toScrimColor(r, g, b) {
  const [h, s, l] = rgbToHsl(r, g, b);
  // A near-grey photo has no hue to borrow, so fall back to the ink scrim.
  if (s < 0.08) return "33 30 25";
  const [sr, sg, sb] = hslToRgb(h, Math.max(s, 0.42), Math.min(0.4, Math.max(0.24, l * 0.7)));
  return `${Math.round(sr)} ${Math.round(sg)} ${Math.round(sb)}`;
}

export function useImagePalette(src, count = 3) {
  const [palette, setPalette] = useState(() => (src ? paletteCache.get(src) ?? null : null));

  useEffect(() => {
    if (!src) {
      setPalette(null);
      return undefined;
    }

    const cached = paletteCache.get(src);
    if (cached) {
      setPalette(cached);
      return undefined;
    }

    let active = true;
    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      try {
        const size = 32;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0, size, size);

        const { data } = context.getImageData(0, 0, size, size);
        const bins = Array.from({ length: 12 }, () => ({ r: 0, g: 0, b: 0, weight: 0 }));

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const [h, s, l] = rgbToHsl(r, g, b);
          // Greys, deep shadows and blown highlights carry no hue worth washing with.
          if (s < 0.12 || l < 0.08 || l > 0.94) continue;
          const bin = bins[Math.min(bins.length - 1, Math.floor(h * bins.length))];
          const weight = s * (1 - Math.abs(l - 0.5));
          bin.r += r * weight;
          bin.g += g * weight;
          bin.b += b * weight;
          bin.weight += weight;
        }

        const colors = bins
          .filter((bin) => bin.weight > 0)
          .sort((a, b) => b.weight - a.weight)
          .slice(0, count)
          .map((bin) => {
            const [h, s, l] = rgbToHsl(bin.r / bin.weight, bin.g / bin.weight, bin.b / bin.weight);
            const [wr, wg, wb] = hslToRgb(
              h,
              Math.min(0.72, Math.max(0.34, s)),
              Math.min(0.72, Math.max(0.46, l)),
            );
            return `${Math.round(wr)} ${Math.round(wg)} ${Math.round(wb)}`;
          });

        paletteCache.set(src, colors);
        if (active) setPalette(colors);
      } catch {
        // A blocked or cross-origin canvas simply leaves the tile without a wash.
      }
    };

    image.src = src;

    return () => {
      active = false;
    };
  }, [src, count]);

  return palette;
}

export function useImageColor(src) {
  const [color, setColor] = useState(() => (src ? cache.get(src) ?? null : null));

  useEffect(() => {
    if (!src) {
      setColor(null);
      return undefined;
    }

    const cached = cache.get(src);
    if (cached) {
      setColor(cached);
      return undefined;
    }

    let active = true;
    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      try {
        const size = 24;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0, size, size);

        const startY = Math.floor(size * 0.55);
        const { data } = context.getImageData(0, startY, size, size - startY);
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count += 1;
        }

        const color = toScrimColor(r / count, g / count, b / count);
        cache.set(src, color);
        if (active) setColor(color);
      } catch {
        // A blocked or cross-origin canvas simply keeps the neutral scrim.
      }
    };

    image.src = src;

    return () => {
      active = false;
    };
  }, [src]);

  return color;
}
