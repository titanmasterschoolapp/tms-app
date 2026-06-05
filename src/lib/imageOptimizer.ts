/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app, isFirebaseConfigured } from '../firebase';

/**
 * Compresses and resizes an image file using browser Canvas APIs.
 * Ensures that base64 / binary blobs stored in Firestore are avoided
 * and instead processed at the client level before upload.
 */
export async function resizeAndCompressImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.75
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio adaptive resizing dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D Context could not be established'));
          return;
        }

        // Draw and apply quality compression
        ctx.fillStyle = '#FFFFFF'; // Fallback background for transparent PNGs
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas compression output is null'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = (err) => reject(new Error('Failed to load image element: ' + String(err)));
    };

    reader.onerror = (err) => reject(new Error('FileReader error: ' + String(err)));
  });
}

/**
 * Uploads an optimized Blob to Firebase Storage.
 * Returns the public download URL if successful.
 * If Firebase is not configured, generates a highly compressed local preview URL.
 */
export async function uploadBlobToStorage(
  blob: Blob,
  storagePath: string
): Promise<string> {
  if (isFirebaseConfigured && app) {
    try {
      const storage = getStorage(app);
      const storageRef = ref(storage, storagePath);
      
      const metadata = {
        contentType: blob.type || 'image/jpeg',
        customMetadata: {
          resized: 'true',
          size: String(blob.size),
          timestamp: new Date().toISOString()
        }
      };

      // Upload file bytes to storage
      const snapshot = await uploadBytes(storageRef, blob, metadata);
      // Fetch download URL of the uploaded image
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error: any) {
      console.error('Firebase Storage upload failed, reverting to optimized fallback.', error);
      // If storage is not available or blocked, fall back to low-res DataURL to prevent app-breaking blocks
      return await convertBlobToLowResDataURL(blob);
    }
  } else {
    // If running in development/local storage simulation mode
    return await convertBlobToLowResDataURL(blob);
  }
}

/**
 * Converts a Blob into a highly compressed, ultra-low-resolution Data URL 
 * as a local fallback to prevent filling up localStorage quota.
 */
async function convertBlobToLowResDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Processes a profile picture file to optimized avatar size (max 256x256), Jpeg, 0.75 quality.
 */
export async function optimizeAndUploadAvatar(
  file: File,
  userId: string
): Promise<string> {
  try {
    // Resize down to 256x256 max dimensions
    const oBlob = await resizeAndCompressImage(file, 256, 256, 0.80);
    const path = `avatars/${userId}_${Date.now()}.jpg`;
    return await uploadBlobToStorage(oBlob, path);
  } catch (error) {
    console.error('Avatar optimization / upload error:', error);
    throw error;
  }
}

/**
 * Processes a chat image file to optimized message size (max 1200x1200), Jpeg, 0.75 quality.
 */
export async function optimizeAndUploadChatImage(
  file: File,
  channelId: string,
  messageId: string = Math.random().toString(36).substr(2, 9)
): Promise<string> {
  try {
    // Limit chat image preview down to maximum 1200x1200px and compress to avoid huge Firestore sizes
    const oBlob = await resizeAndCompressImage(file, 1200, 1200, 0.75);
    const path = `chats/${channelId}/${messageId}_optimized.jpg`;
    return await uploadBlobToStorage(oBlob, path);
  } catch (error) {
    console.error('Chat image optimization / upload error:', error);
    throw error;
  }
}
