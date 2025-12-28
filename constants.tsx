
import { Post } from './types';

export const INITIAL_POSTS: Post[] = [
  {
    id: '1',
    images: ['https://picsum.photos/seed/family1/800/600'],
    en: { title: 'First Steps!', caption: 'Juval was so proud helping Theo walk in the grass today.' },
    es: { title: '¡Primeros Pasos!', caption: 'Juval estaba tan orgulloso ayudando a Theo a caminar en el césped hoy.' },
    date: new Date().toLocaleDateString(),
    author: 'Dad',
    tags: ['Family', 'Juval', 'Theo']
  },
  {
    id: '2',
    images: ['https://picsum.photos/seed/family2/800/600'],
    en: { title: 'Snack Time', caption: 'Theo discovered that blueberries are delicious, and mostly messy!' },
    es: { title: 'Merienda', caption: '¡Theo descubrió que los arándanos son deliciosos, y sobre todo manchan!' },
    date: new Date().toLocaleDateString(),
    author: 'Mom',
    tags: ['Daily', 'Theo']
  }
];

export const COLORS = {
  primary: '#fbbf24',
  secondary: '#3b82f6',
  accent: '#ef4444',
  success: '#22c55e',
  dark: '#0f172a'
};
