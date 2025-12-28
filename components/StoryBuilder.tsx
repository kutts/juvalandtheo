
import React, { useState } from 'react';
import { Theme } from '../types';

interface StoryBuilderProps {
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
  onGenerateMagic?: () => Promise<void>;
  lang: 'en' | 'es';
}

const StoryBuilder: React.FC<StoryBuilderProps> = ({ currentTheme, onThemeChange, onGenerateMagic, lang }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Fix: Replaced invalid theme IDs 'space', 'ocean', and 'forest' with valid Theme values from types.ts
  const themes: { id: Theme; icon: string; color: string; labelEn: string; labelEs: string }[] = [
    { id: 'sunny', icon: '☀️', color: 'bg-yellow-400', labelEn: 'Day', labelEs: 'Día' },
    { id: 'evening', icon: '🚀', color: 'bg-indigo-900', labelEn: 'Space', labelEs: 'Espacio' },
    { id: 'home', icon: '🏠', color: 'bg-orange-400', labelEn: 'Home', labelEs: 'Hogar' },
    { id: 'park', icon: '🌳', color: 'bg-emerald-500', labelEn: 'Forest', labelEs: 'Bosque' },
  ];

  const handleMagicClick = async () => {
    if (!onGenerateMagic || isGenerating) return;
    setIsGenerating(true);
    await onGenerateMagic();
    setIsGenerating(false);
  };

  const magicLabel = isGenerating 
    ? (lang === 'es' ? 'Creando...' : 'Casting...') 
    : (lang === 'es' ? 'Mágico' : 'Magic');

  return (
    <div className="flex justify-center items-center gap-4 my-8">
      <div className="bg-white/60 backdrop-blur-md cartoon-border py-2 px-3 rounded-full flex items-center gap-2 shadow-sm">
        <span className="text-[10px] font-black text-slate-400 uppercase ml-2 mr-1 tracking-tighter">
          {lang === 'es' ? 'Tema' : 'Theme'}
        </span>
        
        <div className="flex gap-1.5">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => onThemeChange(t.id)}
              disabled={isGenerating}
              title={lang === 'es' ? t.labelEs : t.labelEn}
              className={`
                w-10 h-10 rounded-full border-2 border-slate-800 flex items-center justify-center transition-all active:scale-90
                ${currentTheme === t.id ? t.color + ' scale-110 shadow-md' : 'bg-white hover:bg-slate-50'}
                ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <span className="text-lg">{t.icon}</span>
            </button>
          ))}
          
          <button
            onClick={handleMagicClick}
            disabled={isGenerating}
            title={magicLabel}
            className={`
              flex items-center gap-2 pl-2 pr-4 h-10 rounded-full border-2 border-slate-800 transition-all active:scale-95
              ${(currentTheme as string) === 'magic' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-110 shadow-md' : 'bg-white text-purple-600 hover:bg-purple-50'}
              ${isGenerating ? 'animate-pulse' : ''}
            `}
          >
            <span className="text-lg">{isGenerating ? '⌛' : '✨'}</span>
            <span className="font-black text-[10px] uppercase tracking-wider">
              {magicLabel}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoryBuilder;
