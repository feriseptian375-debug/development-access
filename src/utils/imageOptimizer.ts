/**
 * Utility for compressing and optimizing user-uploaded images (logos, officer photos)
 * so that they can be safely stored in LocalStorage, sent across the network,
 * and persisted in server databases without exceeding memory/storage quotas.
 */

export interface OptimizeImageOptions {
  maxDimension?: number;
  quality?: number;
  forceJpeg?: boolean;
}

/**
 * Optimizes an image File into a compact Base64 Data URL.
 * Resizes large camera/phone photos (often 5-15MB) down to crisp, lightweight 20-50KB images.
 */
export async function optimizeImageFile(
  file: File,
  options: OptimizeImageOptions = {},
): Promise<string> {
  const { maxDimension = 600, quality = 0.85, forceJpeg = false } = options;

  // Handle SVG vector graphics directly without rasterization
  if (file.type === 'image/svg+xml') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Gagal membaca file SVG.'));
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Gagal memproses data gambar.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate proportional scale
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = Math.round((height * maxDimension) / img.height);
          }
        }

        // Guarantee minimum dimension of at least 1px
        width = Math.max(1, width);
        height = Math.max(1, height);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to raw data url if canvas context unavailable
          resolve(event.target?.result as string);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Check if image has transparency (PNG) and forceJpeg is false
        const isPng = file.type === 'image/png' && !forceJpeg;

        if (isPng) {
          // Transparent background
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          // If PNG dataUrl is still small (< 250KB), keep it, otherwise compress to JPEG with white background
          if (dataUrl.length < 350000) {
            resolve(dataUrl);
            return;
          }
        }

        // Otherwise render onto white background and compress as high-quality JPEG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Specifically optimizes officer photos for avatar and portrait display (max 500px, JPEG ~30KB).
 */
export async function compressOfficerPhoto(file: File): Promise<string> {
  return optimizeImageFile(file, {
    maxDimension: 500,
    quality: 0.85,
    forceJpeg: true,
  });
}

/**
 * Specifically optimizes agency logos (max 600px, preserves PNG transparency when possible).
 */
export async function compressLogoImage(file: File): Promise<string> {
  return optimizeImageFile(file, {
    maxDimension: 600,
    quality: 0.88,
    forceJpeg: false,
  });
}
