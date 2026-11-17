import type jsQR from 'jsqr';

type Decoder = typeof jsQR;

const MAX_EDGE = 2500;
const CROP_EDGE = 1700;

function imageData(bitmap: ImageBitmap, x: number, y: number, width: number, height: number, maxEdge: number): ImageData {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Trình duyệt không thể đọc ảnh.');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, x, y, width, height, 0, 0, canvas.width, canvas.height);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function hasVisualDetail(image: ImageData): boolean {
  let lowest = 255;
  let highest = 0;
  const stride = Math.max(1, Math.floor(Math.min(image.width, image.height) / 100));
  for (let y = 0; y < image.height; y += stride) {
    for (let x = 0; x < image.width; x += stride) {
      const offset = (y * image.width + x) * 4;
      const shade = (image.data[offset] + image.data[offset + 1] + image.data[offset + 2]) / 3;
      lowest = Math.min(lowest, shade);
      highest = Math.max(highest, shade);
      if (highest - lowest >= 35) return true;
    }
  }
  return false;
}

export function gaussianBinary(image: ImageData, sigma: number, threshold: number, inverted = false): Uint8ClampedArray {
  const { width, height, data } = image;
  const size = width * height;
  const radius = Math.ceil(sigma * 3);
  const kernel = Array.from({ length: radius * 2 + 1 }, (_, index) => Math.exp(-((index - radius) ** 2) / (2 * sigma * sigma)));
  const total = kernel.reduce((sum, value) => sum + value, 0);
  for (let index = 0; index < kernel.length; index++) kernel[index] /= total;
  const gray = new Float32Array(size);
  const horizontal = new Float32Array(size);
  const binary = new Uint8ClampedArray(size * 4);
  for (let index = 0; index < size; index++) {
    const offset = index * 4;
    const alpha = data[offset + 3] / 255;
    const luminance = (data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114) * alpha + 255 * (1 - alpha);
    gray[index] = inverted ? 255 - luminance : luminance;
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value = 0;
      for (let k = -radius; k <= radius; k++) value += gray[y * width + Math.min(width - 1, Math.max(0, x + k))] * kernel[k + radius];
      horizontal[y * width + x] = value;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value = 0;
      for (let k = -radius; k <= radius; k++) value += horizontal[Math.min(height - 1, Math.max(0, y + k)) * width + x] * kernel[k + radius];
      const offset = (y * width + x) * 4;
      const shade = value < threshold ? 0 : 255;
      binary[offset] = binary[offset + 1] = binary[offset + 2] = shade;
      binary[offset + 3] = 255;
    }
  }
  return binary;
}

export function decodeQrPixels(image: ImageData, jsQR: Decoder, stylized: boolean): string | null {
  const direct = jsQR(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' });
  if (direct?.data) return direct.data;
  if (stylized) {
    for (const inverted of [false, true]) {
      for (const [sigma, threshold] of [[1, 200], [1.5, 180]]) {
        const processed = gaussianBinary(image, sigma, threshold, inverted);
        const result = jsQR(processed, image.width, image.height, { inversionAttempts: 'attemptBoth' });
        if (result?.data) return result.data;
      }
    }
  }
  if (image.width >= 100 && image.height >= 100 && image.width <= 500 && image.height <= 500) {
    const upscaled = upscaleNearest(image);
    return decodeQrPixels(upscaled, jsQR, true);
  }
  return null;
}

function upscaleNearest(image: ImageData): ImageData {
  const width = image.width * 2;
  const height = image.height * 2;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const source = ((y >> 1) * image.width + (x >> 1)) * 4;
      const target = (y * width + x) * 4;
      data[target] = image.data[source];
      data[target + 1] = image.data[source + 1];
      data[target + 2] = image.data[source + 2];
      data[target + 3] = image.data[source + 3];
    }
  }
  return { data, width, height } as ImageData;
}

export async function readQrFromImage(bitmap: ImageBitmap, jsQR: Decoder): Promise<string | null> {
  const whole = imageData(bitmap, 0, 0, bitmap.width, bitmap.height, MAX_EDGE);
  if (!hasVisualDetail(whole)) return null;
  const wholeResult = decodeQrPixels(whole, jsQR, whole.width <= 1000 && whole.height <= 1000);
  if (wholeResult) return wholeResult;
  // Overlapping crops preserve detail when a QR occupies only a small part of a screenshot.
  for (const divisions of [2, 3]) {
    const fraction = divisions === 2 ? 0.6 : 0.42;
    const width = Math.max(1, Math.round(bitmap.width * fraction));
    const height = Math.max(1, Math.round(bitmap.height * fraction));
    for (let row = 0; row < divisions; row++) {
      for (let column = 0; column < divisions; column++) {
        const x = Math.round((bitmap.width - width) * column / (divisions - 1));
        const y = Math.round((bitmap.height - height) * row / (divisions - 1));
        const crop = imageData(bitmap, x, y, width, height, CROP_EDGE);
        if (!hasVisualDetail(crop)) continue;
        const result = decodeQrPixels(crop, jsQR, true);
        if (result) return result;
        await new Promise<void>(resolve => setTimeout(resolve, 0));
      }
    }
  }
  return null;
}
