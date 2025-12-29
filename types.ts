
export interface PostContent {
  title: string;
  caption: string;
}

export interface Post {
  id: string;
  images: string[];
  en: PostContent;
  es: PostContent;
  date: string;
  author: 'Dad' | 'Mom';
  tags: string[];
}

export type AuthUser = 'Dad' | 'Mom' | null;
export type Theme = 'space' | 'ocean' | 'jungle' | 'sports' | 'pokemon' | 'dinosaur';
export type Page = 'home' | 'gallery' | 'upload' | 'latest' | 'detail' | 'login' | 'settings' | 'firstTimeSetup';
