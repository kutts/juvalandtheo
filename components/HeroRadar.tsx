
import React from 'react';
import { Post } from '../types';

interface HeroAlbumProps {
  posts: Post[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  lang: 'en' | 'es';
}

const HeroAlbum: React.FC<HeroAlbumProps> = ({ posts, activeFilter, onFilterChange, lang }) => {
  const counts = {
    all: posts.length,
    juval: posts.filter(p => p.tags.includes('Juval')).length,
    theo: posts.filter(p => p.tags.includes('Theo')).length,
  };

  const labels = {
    all: lang === 'es' ? 'Todos' : 'All',
    juval: 'Juval',
    theo: 'Theo',
    title: lang === 'es' ? 'Nuestros Álbumes' : 'Our Albums'
  };

  const filters = [
    { id: 'all', label: labels.all, icon: '🏠', color: 'bg-amber-400', count: counts.all },
    { id: 'juval', label: labels.juval, icon: '👦', color: 'bg-sky-400', count: counts.juval },
    { id: 'theo', label: labels.theo, icon: '👶', color: 'bg-rose-400', count: counts.theo },
  ];

  return (
    <div className="flex flex-col items-center gap-4 my-8 animate-fade-in">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
        {labels.title}
      </span>

      <div className="bg-white/40 backdrop-blur-sm cartoon-border p-2 rounded-[32px] flex gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={`
              flex items-center gap-3 px-6 py-2 rounded-2xl transition-all active:scale-95 group border-2
              ${activeFilter === f.id 
                ? f.color + ' border-slate-800 shadow-[4px_4px_0px_#1e293b]' 
                : 'bg-white border-transparent text-slate-400 hover:text-slate-600'}
            `}
          >
            <span className={`text-xl transition-transform ${activeFilter === f.id ? 'scale-125' : 'group-hover:scale-110'}`}>
              {f.icon}
            </span>
            <div className="flex flex-col items-start">
              <span className={`font-black text-sm uppercase ${activeFilter === f.id ? 'text-slate-900' : ''}`}>{f.label}</span>
              <span className={`text-[9px] font-bold opacity-60 ${activeFilter === f.id ? 'text-slate-800' : ''}`}>
                {f.count} {lang === 'es' ? 'Momentos' : 'Moments'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HeroAlbum;
