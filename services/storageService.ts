import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

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
