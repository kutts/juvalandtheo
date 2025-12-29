/**
 * Compress an image to reduce localStorage usage
 * @param base64Image - Base64 encoded image string
 * @param maxWidth - Maximum width in pixels
 * @param quality - JPEG quality (0-1)
 * @returns Compressed base64 image
 */
export async function compressImage(
  base64Image: string,
  maxWidth: number = 800,
  quality: number = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to base64 with compression
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedBase64);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = base64Image;
  });
}

/**
 * Compress multiple images
 */
export async function compressImages(
  base64Images: string[],
  maxWidth: number = 800,
  quality: number = 0.7
): Promise<string[]> {
  return Promise.all(
    base64Images.map(img => compressImage(img, maxWidth, quality))
  );
}

/**
 * Estimate localStorage usage in MB
 */
export function getLocalStorageSize(): number {
  let total = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return total / 1024 / 1024; // Convert to MB
}

/**
 * Check if we have enough space for new data
 */
export function hasStorageSpace(estimatedSizeMB: number): boolean {
  const currentSizeMB = getLocalStorageSize();
  const maxSizeMB = 5; // Conservative estimate (actual limit is usually 5-10MB)
  return (currentSizeMB + estimatedSizeMB) < maxSizeMB;
}
