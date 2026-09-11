import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export interface CroppedAreaPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Loads an image from a URL or ObjectURL asynchronously.
 */
export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
}

/**
 * Extracts the cropped area onto a fixed 512x512 canvas,
 * then converts to WebP (with fallback to JPEG if WebP encoding is unsupported).
 */
export async function getCroppedImgBlob(
  imageSrc: string,
  pixelCrop: CroppedAreaPixels
): Promise<{ blob: Blob; format: 'webp' | 'jpeg' }> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D rendering context not available');
  }

  // Smooth image scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw the selected crop box scaled into the 512x512 output square
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    512,
    512
  );

  // Feature-detect WebP encoding on canvas.toBlob
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (webpBlob) => {
          if (webpBlob && webpBlob.type === 'image/webp' && webpBlob.size > 0) {
            resolve({ blob: webpBlob, format: 'webp' });
          } else {
            // WebP encoding unsupported or returned null — fallback to JPEG
            canvas.toBlob(
              (jpegBlob) => {
                if (jpegBlob && jpegBlob.size > 0) {
                  resolve({ blob: jpegBlob, format: 'jpeg' });
                } else {
                  reject(new Error('Failed to encode cropped image to JPEG'));
                }
              },
              'image/jpeg',
              0.82
            );
          }
        },
        'image/webp',
        0.82
      );
    } catch {
      // Fallback in case browser threw directly on image/webp MIME type
      canvas.toBlob(
        (jpegBlob) => {
          if (jpegBlob && jpegBlob.size > 0) {
            resolve({ blob: jpegBlob, format: 'jpeg' });
          } else {
            reject(new Error('Failed to encode cropped image to JPEG'));
          }
        },
        'image/jpeg',
        0.82
      );
    }
  });
}

/**
 * Deletes all previous avatar representations for a user (avatar.webp, avatar.jpg, and legacy .jpg).
 * Ignores 'storage/object-not-found' errors so it never breaks if the file doesn't exist yet.
 */
export async function deleteUserAvatars(uid: string): Promise<void> {
  const storageInstance = storage;
  if (!storageInstance || !uid) return;

  const candidatePaths = [
    `profile-pictures/${uid}/avatar.webp`,
    `profile-pictures/${uid}/avatar.jpg`,
    `profile-pictures/${uid}.jpg`,
  ];

  await Promise.all(
    candidatePaths.map(async (filePath) => {
      try {
        const fileRef = ref(storageInstance, filePath);
        await deleteObject(fileRef);
      } catch (err: unknown) {
        // Silently ignore if object does not exist
        const code = (err as { code?: string })?.code;
        if (code !== 'storage/object-not-found') {
          console.warn(`[AVATAR-CLEANUP] Could not remove ${filePath}:`, code || err);
        }
      }
    })
  );
}

/**
 * Deletes any existing avatar, uploads the new 512x512 WebP/JPEG blob to the deterministic fixed path,
 * and returns the permanent Storage download URL.
 */
export async function uploadUserAvatarBlob(
  uid: string,
  blob: Blob,
  format: 'webp' | 'jpeg'
): Promise<string> {
  const storageInstance = storage;
  if (!storageInstance) {
    throw new Error('Firebase Storage is not initialized');
  }

  // 1. Delete both avatar.webp and avatar.jpg first (guarantees exactly 1 file per user)
  await deleteUserAvatars(uid);

  // 2. Upload to the deterministic path for this format
  const fixedPath = `profile-pictures/${uid}/avatar.${format}`;
  const storageRef = ref(storageInstance, fixedPath);

  await uploadBytes(storageRef, blob, {
    contentType: format === 'webp' ? 'image/webp' : 'image/jpeg',
    cacheControl: 'public, max-age=31536000',
  });

  // 3. Obtain download URL
  return await getDownloadURL(storageRef);
}
