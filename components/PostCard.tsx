
import React, { useState, useEffect, useRef } from 'react';
import { Post } from '../types';

interface PostCardProps {
  post: Post;
  variant?: 'large' | 'small';
  lang: 'en' | 'es';
  onDelete?: (id: string) => void;
  onOpen?: (post: Post) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, variant = 'small', lang, onDelete, onOpen }) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number>(1.333); // Default 4:3
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const minSwipeDistance = 50;
  const byLabel = lang === 'es' ? 'Por' : 'By';
  const deleteConfirmLabel = lang === 'es' ? '¿Borrar Recuerdo?' : 'Delete Memory?';
  
  const content = post[lang];
  
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth && naturalHeight) {
      setAspectRatio(naturalWidth / naturalHeight);
    }
  };

  const handleNext = () => {
    if (post.images.length > 1) {
      setActiveImageIndex((prev) => (prev + 1) % post.images.length);
    }
  };

  const handlePrev = () => {
    if (post.images.length > 1) {
      setActiveImageIndex((prev) => (prev - 1 + post.images.length) % post.images.length);
    }
  };

  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleNext();
  };

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    handlePrev();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  const handleToggleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(!showConfirm);
  };

  const handleFinalDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(post.id);
      setShowConfirm(false);
    }
  };

  const handleCardClick = () => {
    if (onOpen && !showConfirm) {
      onOpen(post);
    }
  };

  const getTagStyle = (tag: string) => {
    const t = tag.toLowerCase();
    if (t.includes('juval')) return 'bg-sky-400 text-white';
    if (t.includes('theo')) return 'bg-rose-400 text-white';
    if (t.includes('mom') || t.includes('mamá')) return 'bg-rose-500 text-white';
    if (t.includes('dad') || t.includes('papá')) return 'bg-sky-600 text-white';
    return 'bg-amber-400 text-slate-900';
  };

  const isLarge = variant === 'large';
  const halftoneBg = `radial-gradient(circle, #e2e8f0 1.5px, transparent 1.5px)`;

  return (
    <div 
      className={`bg-white cartoon-border rounded-[40px] overflow-hidden transition-all relative 
        ${!isLarge ? 'hover:translate-y-[-8px] active:translate-y-[0px] flex flex-col shadow-xl' : 'max-w-5xl mx-auto shadow-2xl mb-12'}
        ${showConfirm ? 'animate-[shake_0.5s_infinite]' : ''}
      `}
    >
      <style>{`
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(0.8deg); }
          75% { transform: rotate(-0.8deg); }
        }
      `}</style>

      {onDelete && (
        <div className="absolute top-6 right-6 z-[80] flex items-center gap-3">
          {showConfirm ? (
            <div className="flex gap-2 animate-fade-in">
              <button 
                type="button"
                onClick={handleFinalDelete}
                className="bg-red-500 cartoon-border px-6 py-3 rounded-2xl font-black text-white shadow-lg hover:scale-110 active:scale-95 transition-all text-base uppercase flex items-center gap-2"
              >
                ✅ {lang === 'es' ? 'SÍ' : 'YES'}
              </button>
              <button 
                type="button"
                onClick={handleToggleConfirm}
                className="bg-slate-500 cartoon-border px-6 py-3 rounded-2xl font-black text-white shadow-lg hover:scale-110 active:scale-95 transition-all text-base uppercase flex items-center gap-2"
              >
                ❌ {lang === 'es' ? 'NO' : 'NO'}
              </button>
            </div>
          ) : (
            <button 
              type="button"
              onClick={handleToggleConfirm}
              className="bg-white/95 backdrop-blur-md cartoon-border w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black text-slate-800 shadow-[6px_6px_0px_#1e293b] hover:scale-125 hover:bg-red-500 hover:text-white active:scale-95 transition-all cursor-pointer group"
              title={lang === 'es' ? 'Borrar' : 'Delete'}
            >
              <span className="group-hover:animate-bounce">🗑️</span>
            </button>
          )}
        </div>
      )}

      <div 
        onClick={handleCardClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative group overflow-hidden flex items-center justify-center cursor-pointer transition-all duration-500 ease-in-out border-b-4 border-slate-800
          ${showConfirm ? 'opacity-40 grayscale-[0.5]' : ''}
        `}
        style={{ 
          aspectRatio: isLarge ? 'auto' : `${aspectRatio}`,
          minHeight: isLarge ? 'auto' : '350px',
          background: halftoneBg,
          backgroundSize: '20px 20px'
        }}
      >
        <img 
          key={post.images[activeImageIndex]}
          ref={imageRef}
          src={post.images[activeImageIndex]} 
          alt={content.title} 
          onLoad={handleImageLoad}
          className={`animate-fade-in transition-all duration-500 object-contain relative z-0 p-6 select-none
            ${isLarge ? 'max-w-full max-h-[75vh] w-auto h-auto' : 'w-full h-full'}
          `}
          draggable="false"
        />
        
        {post.images.length > 1 && !showConfirm && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="absolute inset-y-0 left-0 flex items-center px-6 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto hidden md:flex">
              <button 
                type="button"
                onClick={prevImg} 
                className="bg-white border-[4px] border-slate-800 w-14 h-14 rounded-full flex items-center justify-center active:scale-90 shadow-[4px_4px_0px_#1e293b] transition-all hover:scale-110 hover:bg-amber-400"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="text-slate-800">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center px-6 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto hidden md:flex">
              <button 
                type="button"
                onClick={nextImg} 
                className="bg-white border-[4px] border-slate-800 w-14 h-14 rounded-full flex items-center justify-center active:scale-90 shadow-[4px_4px_0px_#1e293b] transition-all hover:scale-110 hover:bg-amber-400"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="text-slate-800">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 md:hidden">
              {post.images.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-2.5 h-2.5 rounded-full border-2 border-slate-800 transition-all ${i === activeImageIndex ? 'bg-amber-400 scale-125' : 'bg-white'}`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="absolute inset-0 z-20 pointer-events-none">
          <div className="absolute top-8 left-8 flex flex-col gap-4 items-start pointer-events-auto">
            <div className="bg-amber-400 cartoon-border px-6 py-2 rounded-2xl text-base font-black shadow-lg transform -rotate-3 select-none text-slate-900">
              {post.date}
            </div>
          </div>
          
          {!showConfirm && (
            <div className="absolute bottom-8 right-8 bg-sky-400 cartoon-border px-6 py-2 rounded-2xl text-base font-black text-white shadow-lg transform rotate-3 select-none pointer-events-auto">
              {byLabel} {post.author === 'Dad' ? (lang === 'es' ? 'Papá' : 'Dad') : (lang === 'es' ? 'Mamá' : 'Mom')}
            </div>
          )}
        </div>
      </div>
      
      <div 
        onClick={handleCardClick}
        className={`p-10 md:p-12 flex-grow cursor-pointer ${isLarge ? 'text-center' : ''} ${showConfirm ? 'opacity-30' : ''}`}
      >
        <h3 className={`${isLarge ? 'text-5xl md:text-7xl' : 'text-3xl md:text-4xl'} font-black mb-6 text-slate-800 uppercase tracking-tighter leading-none`}>
          {content.title}
        </h3>
        <p className={`${isLarge ? 'text-2xl md:text-3xl' : 'text-xl'} text-slate-600 leading-relaxed mb-10 italic font-semibold max-w-4xl mx-auto`}>
          "{content.caption}"
        </p>
        <div className={`flex flex-wrap gap-4 ${isLarge ? 'justify-center' : ''}`}>
          {post.tags.map(tag => (
            <span 
              key={tag} 
              className={`${getTagStyle(tag)} border-[3px] border-slate-800 px-5 py-2 rounded-2xl text-sm font-black uppercase tracking-tight shadow-[4px_4px_0px_#1e293b]`}
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {showConfirm && (
        <div className="absolute inset-0 z-[75] flex items-center justify-center p-8 text-center pointer-events-none bg-slate-800/10 backdrop-blur-[4px]">
          <div className="bg-white cartoon-border p-10 rounded-[50px] animate-float pointer-events-auto shadow-[20px_20px_0px_#1e293b]">
             <h4 className="text-4xl font-black text-slate-800 uppercase mb-4">{deleteConfirmLabel}</h4>
             <p className="text-slate-500 font-bold italic text-lg">{lang === 'es' ? 'Este recuerdo saldrá del álbum...' : 'This memory will leave the album...'}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;
