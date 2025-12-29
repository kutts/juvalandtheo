import { ref, uploadString, getDownloadURL, deleteObject, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';
import { MediaItem } from '../types';

/**
 * Upload a base64 image to Firebase Storage
 * @param base64Image - Base64 encoded image string
 * @param path - Storage path (e.g., 'posts/postId/image1.jpg')
 * @returns Download URL for the uploaded image
 */
export async function uploadImage(base64Image: string, path: string): Promise<string> {
  try {
    const storageRef = ref(storage, path);

    // Upload the base64 image
    const snapshot = await uploadString(storageRef, base64Image, 'data_url');

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log('[STORAGE] Image uploaded:', path);
    return downloadURL;
  } catch (error) {
    console.error('[STORAGE] Error uploading image:', error);
    throw error;
  }
}

/**
 * Upload multiple images to Firebase Storage
 * @param base64Images - Array of base64 encoded images
 * @param postId - Post ID for organizing images
 * @returns Array of download URLs
 */
export async function uploadImages(base64Images: string[], postId: string): Promise<string[]> {
  try {
    const uploadPromises = base64Images.map((image, index) => {
      const path = `posts/${postId}/image_${index}.jpg`;
      return uploadImage(image, path);
    });

    const urls = await Promise.all(uploadPromises);
    console.log('[STORAGE] Uploaded', urls.length, 'images for post', postId);
    return urls;
  } catch (error) {
    console.error('[STORAGE] Error uploading images:', error);
    throw error;
  }
}

/**
 * Delete an image from Firebase Storage
 * @param imageUrl - Full download URL of the image
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    // Extract the storage path from the URL
    const url = new URL(imageUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+)\?/);

    if (!pathMatch) {
      throw new Error('Invalid image URL');
    }

    const path = decodeURIComponent(pathMatch[1]);
    const storageRef = ref(storage, path);

    await deleteObject(storageRef);
    console.log('[STORAGE] Image deleted:', path);
  } catch (error) {
    console.error('[STORAGE] Error deleting image:', error);
    throw error;
  }
}

/**
 * Delete all images for a post
 * @param imageUrls - Array of image URLs to delete
 */
export async function deleteImages(imageUrls: string[]): Promise<void> {
  try {
    const deletePromises = imageUrls.map(url => deleteImage(url));
    await Promise.all(deletePromises);
    console.log('[STORAGE] Deleted', imageUrls.length, 'images');
  } catch (error) {
    console.error('[STORAGE] Error deleting images:', error);
    // Don't throw - some images might already be deleted
  }
}

/**
 * Upload a video file to Firebase Storage
 * @param file - Video file blob
 * @param path - Storage path (e.g., 'posts/postId/video1.mp4')
 * @returns Download URL for the uploaded video
 */
export async function uploadVideo(file: Blob, path: string): Promise<string> {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log('[STORAGE] Video uploaded:', path);
    return downloadURL;
  } catch (error) {
    console.error('[STORAGE] Error uploading video:', error);
    throw error;
  }
}

/**
 * Upload mixed media (images and videos) to Firebase Storage
 * @param files - Array of File objects (images or videos)
 * @param postId - Post ID for organizing media
 * @returns Array of MediaItem objects with URLs and types
 */
export async function uploadMedia(files: File[], postId: string): Promise<MediaItem[]> {
  try {
    const uploadPromises = files.map(async (file, index) => {
      const isVideo = file.type.startsWith('video/');
      const extension = isVideo ? 'mp4' : 'jpg';
      const prefix = isVideo ? 'video' : 'image';
      const path = `posts/${postId}/${prefix}_${index}.${extension}`;

      if (isVideo) {
        const url = await uploadVideo(file, path);
        return { url, type: 'video' as const };
      } else {
        // For images, convert to base64 and compress
        const base64 = await fileToBase64(file);
        const url = await uploadImage(base64, path);
        return { url, type: 'image' as const };
      }
    });

    const mediaItems = await Promise.all(uploadPromises);
    console.log('[STORAGE] Uploaded', mediaItems.length, 'media items for post', postId);
    return mediaItems;
  } catch (error) {
    console.error('[STORAGE] Error uploading media:', error);
    throw error;
  }
}

/**
 * Convert File to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Delete all media for a post
 * @param mediaItems - Array of media items to delete
 */
export async function deleteMedia(mediaItems: MediaItem[]): Promise<void> {
  try {
    const deletePromises = mediaItems.map(item => deleteImage(item.url)); // deleteImage works for videos too
    await Promise.all(deletePromises);
    console.log('[STORAGE] Deleted', mediaItems.length, 'media items');
  } catch (error) {
    console.error('[STORAGE] Error deleting media:', error);
  }
}
