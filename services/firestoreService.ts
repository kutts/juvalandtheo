import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Post } from '../types';

const POSTS_COLLECTION = 'posts';

/**
 * Add a new post to Firestore
 */
export async function addPost(post: Omit<Post, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, POSTS_COLLECTION), {
      ...post,
      createdAt: Timestamp.now()
    });
    console.log('[FIRESTORE] Post added with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('[FIRESTORE] Error adding post:', error);
    throw error;
  }
}

/**
 * Get all posts from Firestore, ordered by creation date
 */
export async function getPosts(maxPosts: number = 50): Promise<Post[]> {
  try {
    const q = query(
      collection(db, POSTS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(maxPosts)
    );

    const querySnapshot = await getDocs(q);
    const posts: Post[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        images: data.images,
        en: data.en,
        es: data.es,
        date: data.date,
        author: data.author,
        tags: data.tags
      });
    });

    console.log('[FIRESTORE] Loaded', posts.length, 'posts');
    return posts;
  } catch (error) {
    console.error('[FIRESTORE] Error getting posts:', error);
    throw error;
  }
}

/**
 * Delete a post from Firestore
 */
export async function deletePost(postId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, POSTS_COLLECTION, postId));
    console.log('[FIRESTORE] Post deleted:', postId);
  } catch (error) {
    console.error('[FIRESTORE] Error deleting post:', error);
    throw error;
  }
}
