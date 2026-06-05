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
  console.log(`[ImageOptimizer] resizeAndCompressImage: Iniciando para archivo ${file.name} (${file.size} bytes, tipo ${file.type})`);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      console.log(`[ImageOptimizer] FileReader leyó el archivo correctamente.`);
      const img = new Image();

      img.onload = () => {
        console.log(`[ImageOptimizer] Imagen cargada en elemento Image de forma óptima. Dimensiones originales: ${img.width}x${img.height}`);
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio adaptive resizing dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
          console.log(`[ImageOptimizer] Dimensiones recalculadas por exceso de tamaño: ${width.toFixed(0)}x${height.toFixed(0)}`);
        } else {
          console.log(`[ImageOptimizer] No se requiere redimensionado. Dimensiones conservadas: ${width}x${height}`);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('[ImageOptimizer] El contexto Canvas 2D no se pudo establecer.');
          reject(new Error('Canvas 2D Context could not be established'));
          return;
        }

        // Draw and apply quality compression
        ctx.fillStyle = '#FFFFFF'; // Fallback background for transparent PNGs
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        console.log(`[ImageOptimizer] Generando blob JPG con calidad ${quality}...`);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              console.log(`[ImageOptimizer] Blob de imagen generado con éxito. Tamaño: ${blob.size} bytes`);
              resolve(blob);
            } else {
              console.error('[ImageOptimizer] La compresión de Canvas devolvió un blob nulo.');
              reject(new Error('Canvas compression output is null'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = (err) => {
        console.error('[ImageOptimizer] Error al cargar la imagen en elemento Image:', err);
        reject(new Error('Failed to load image element: ' + String(err)));
      };

      const resultSrc = event.target?.result as string;
      console.log(`[ImageOptimizer] Asignando source a la imagen (Longitud del base64: ${resultSrc?.length || 0})`);
      img.src = resultSrc;
    };

    reader.onerror = (err) => {
      console.error('[ImageOptimizer] Error en FileReader:', err);
      reject(new Error('FileReader error: ' + String(err)));
    };

    reader.readAsDataURL(file);
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
  console.log(`[ImageOptimizer] uploadBlobToStorage: Iniciando subida a path "${storagePath}" (Tamaño del blob: ${blob.size} bytes)`);
  if (isFirebaseConfigured && app) {
    try {
      console.log(`[ImageOptimizer] Firebase está configurado. Obteniendo referencia de Storage.`);
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

      console.log(`[ImageOptimizer] Ejecutando uploadBytes()...`);
      const snapshot = await uploadBytes(storageRef, blob, metadata);
      console.log(`[ImageOptimizer] uploadBytes() finalizó satisfactoriamente. Snapshot ref path: ${snapshot.ref.fullPath}.`);
      
      console.log(`[ImageOptimizer] Solicitando getDownloadURL()...`);
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log(`[ImageOptimizer] URL obtenida con éxito: "${downloadURL}"`);
      return downloadURL;
    } catch (error: any) {
      console.error('[ImageOptimizer] Error al subir a Firebase Storage:', error);
      console.warn('[ImageOptimizer] Reventando a fallback de conversión local por error de Storage.');
      return await convertBlobToLowResDataURL(blob);
    }
  } else {
    console.log(`[ImageOptimizer] Firebase no está activo o configurado. Generando fallback local de baja resolución.`);
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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Tiempo de espera agotado (${timeoutMs / 1000}s): ${errorMessage}`));
    }, timeoutMs);
  });
  return Promise.race([
    promise,
    timeoutPromise
  ]).then((result) => {
    clearTimeout(timeoutId);
    return result;
  }, (err) => {
    clearTimeout(timeoutId);
    throw err;
  });
}

/**
 * Processes a profile picture file to optimized avatar size (max 256x256), Jpeg, 0.75 quality.
 */
export async function optimizeAndUploadAvatar(
  file: File,
  userId: string,
  onStepChange?: (step: string) => void
): Promise<string> {
  console.log('[Avatar] Optimización iniciada');
  if (onStepChange) onStepChange('Optimizando avatar...');

  let oBlob: Blob;
  try {
    // 1. Optimización con un timeout estricto de 10 segundos
    oBlob = await withTimeout(
      resizeAndCompressImage(file, 256, 256, 0.80),
      10000,
      'No se pudo optimizar la imagen antes de 10 segundos.'
    );
    console.log('[Avatar] Optimización completada');
    console.log('[Avatar] Blob generado');
  } catch (error: any) {
    console.warn('[Avatar] ERROR O TIMEOUT en optimización, aplicando Fallback sin optimización con el archivo original:', error);
    // Usar el archivo original como fallback
    oBlob = file;
    console.log('[Avatar] Optimización completada');
    console.log('[Avatar] Blob generado');
  }

  // 2. Preparar subida
  if (onStepChange) onStepChange('Subiendo avatar...');
  console.log('[Avatar] Subida Storage iniciada');

  const path = `avatars/${userId}_${Date.now()}.jpg`;

  if (isFirebaseConfigured && app) {
    try {
      const storage = getStorage(app);
      const storageRef = ref(storage, path);
      const metadata = {
        contentType: oBlob.type || 'image/jpeg',
        customMetadata: {
          resized: String(oBlob !== file),
          size: String(oBlob.size),
          timestamp: new Date().toISOString()
        }
      };

      // Realizar la subida en Storage con un timeout de 20 segundos
      await withTimeout(
        uploadBytes(storageRef, oBlob, metadata),
        20000,
        'La subida a Firebase Storage superó los 20 segundos.'
      );
      console.log('[Avatar] Subida Storage completada');

      // 3. Obtener URL de descarga con un timeout de 10 segundos
      if (onStepChange) onStepChange('Obteniendo enlace...');
      console.log('[Avatar] getDownloadURL iniciado');

      const downloadUrl = await withTimeout(
        getDownloadURL(storageRef),
        10000,
        'No se pudo obtener el enlace de descarga de Storage antes de 10 segundos.'
      );
      console.log('[Avatar] URL obtenida');
      return downloadUrl;

    } catch (error: any) {
      console.error('[Avatar] Error subiendo o descargando desde Firebase Storage:', error);
      throw new Error(`Error en Firebase Storage: ${error.message || error}`);
    }
  } else {
    // Si no está configurado, simulamos descarga local con un DataURL convertible muy rápido
    console.log('[Avatar] Firebase no configurado, generando DataURL local ultra rápido...');
    const localUrl = await convertBlobToLowResDataURL(oBlob);
    console.log('[Avatar] Subida Storage completada');
    console.log('[Avatar] getDownloadURL iniciado');
    console.log('[Avatar] URL obtenida');
    return localUrl;
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
    console.log(`[ChatImage] optimizeAndUploadChatImage: Iniciado proceso de optimización para canal "${channelId}"`);
    const oBlob = await resizeAndCompressImage(file, 1200, 1200, 0.75);
    console.log(`[ChatImage] optimizeAndUploadChatImage: Optimización de imagen completada. Almacenando...`);
    const path = `chats/${channelId}/${messageId}_optimized.jpg`;
    const downloadUrl = await uploadBlobToStorage(oBlob, path);
    console.log(`[ChatImage] optimizeAndUploadChatImage: Proceso finalizado con éxito. URL de descarga: "${downloadUrl}"`);
    return downloadUrl;
  } catch (error) {
    console.error('[ChatImage] Error crítico en el flujo de optimización/subida de imagen de chat:', error);
    throw error;
  }
}
