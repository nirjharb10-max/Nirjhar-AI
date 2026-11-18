export interface ProcessedImage {
  dataUrl: string;
  fileName: string;
}

const MAX_DIMENSION = 1280;

export function processUploadedImage(file: File): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file (PNG, JPG, WebP, or GIF).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Unexpected file reader result.'));
        return;
      }

      // Preserve animated GIFs directly if reasonably sized
      if (file.type === 'image/gif' && file.size <= 3 * 1024 * 1024) {
        resolve({ dataUrl: result, fileName: file.name });
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('The selected image could not be decoded.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: result, fileName: file.name });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const quality = outputMime === 'image/jpeg' ? 0.86 : undefined;
        const compressedDataUrl = canvas.toDataURL(outputMime, quality);
        resolve({ dataUrl: compressedDataUrl, fileName: file.name });
      };
      img.src = result;
    };

    reader.readAsDataURL(file);
  });
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}
