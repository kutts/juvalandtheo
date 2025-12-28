
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Post, Page, AuthUser, Theme } from './types';
import { INITIAL_POSTS } from './constants';
import PostCard from './components/PostCard';
import HeroAlbum from './components/HeroRadar'; 
import { generateBilingualPost } from './services/geminiService';

const MAX_POSTS_IN_STORAGE = 12;
const THEMES: Theme[] = ['sunny', 'evening', 'park', 'home'];

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [user, setUser] = useState<AuthUser>(null);
  const [pin, setPin] = useState('');
  const [loginTarget, setLoginTarget] = useState<AuthUser>(null);
  const [theme, setTheme] = useState<Theme>('sunny');
  const [heroFilter, setHeroFilter] = useState('all');
  
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [userContext, setUserContext] = useState('');
  const [taggedBoys, setTaggedBoys] = useState<string[]>([]);
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);

  const initialized = useRef(false);

  const t = {
    club: lang === 'es' ? 'Nuestro Álbum Familiar' : 'Our Family Album',
    home: lang === 'es' ? 'Inicio' : 'Home',
    latest: lang === 'es' ? 'Lo Más Nuevo' : 'Latest',
    welcome: lang === 'es' ? '¡Bienvenidos a nuestro mundo!' : "Welcome to our world!",
    dadCorner: lang === 'es' ? 'Papá' : "Dad",
    momCorner: lang === 'es' ? 'Mamá' : "Mom",
    back: lang === 'es' ? '← Volver' : '← Back',
    fresh: lang === 'es' ? 'Último Momento' : 'Latest Moment',
    archives: lang === 'es' ? 'Recuerdos Pasados' : 'Memory Lane',
    geminiMagic: lang === 'es' ? 'Escribiendo el recuerdo...' : 'Writing the memory...',
    mixingColors: lang === 'es' ? 'Guardando fotos...' : 'Saving photos...',
    done: lang === 'es' ? '¡Recuerdo Guardado!' : 'Memory Saved!',
    multipleHint: lang === 'es' ? 'Elige las fotos para el álbum' : 'Pick photos for the album',
    whoAreYou: lang === 'es' ? '¿Quién eres?' : 'Who are you?',
    enterPin: lang === 'es' ? 'Código Secreto' : 'Secret Code',
    logout: lang === 'es' ? 'Salir' : 'Logout',
    tellStory: lang === 'es' ? '¿Qué pasó hoy?' : 'What happened today?',
    placeholderContext: lang === 'es' ? 'Cuéntanos un poco sobre este momento...' : 'Tell us a bit about this moment...',
    startMission: lang === 'es' ? '✨ GUARDAR RECUERDO' : '✨ SAVE MEMORY',
    selectHeroes: lang === 'es' ? '¿Quién sale en las fotos?' : 'Who is in these photos?',
    selectDate: lang === 'es' ? '📅 ¿Cuándo pasó esto?' : '📅 When did this happen?',
  };

  const filteredPosts = useMemo(() => {
    if (heroFilter === 'all') return posts;
    const searchTag = heroFilter.charAt(0).toUpperCase() + heroFilter.slice(1);
    return posts.filter(p => p.tags.includes(searchTag));
  }, [posts, heroFilter]);

  useEffect(() => {
    // Pick a random theme once on load
    const randomTheme = THEMES[Math.floor(Math.random() * THEMES.length)];
    setTheme(randomTheme);
  }, []);

  useEffect(() => {
    try {
      const savedPosts = localStorage.getItem('juval-theo-posts');
      const savedLang = localStorage.getItem('juval-theo-lang');
      const savedUser = localStorage.getItem('juval-theo-user') as AuthUser;
      
      if (savedPosts) {
        const parsed = JSON.parse(savedPosts);
        setPosts(Array.isArray(parsed) ? parsed : INITIAL_POSTS);
      } else {
        setPosts(INITIAL_POSTS);
      }
      
      if (savedLang === 'en' || savedLang === 'es') setLang(savedLang);
      if (savedUser) setUser(savedUser);
    } catch (e) {
      console.error("Storage load failed", e);
      setPosts(INITIAL_POSTS);
    }
    initialized.current = true;
  }, []);

  useEffect(() => {
    if (initialized.current) {
      try {
        localStorage.setItem('juval-theo-posts', JSON.stringify(posts));
      } catch (e) {
        console.warn("Storage full, pruning...", e);
        setPosts(posts.slice(0, 5));
      }
    }
  }, [posts]);

  const toggleLanguage = () => {
    const newLang = lang === 'en' ? 'es' : 'en';
    setLang(newLang);
    localStorage.setItem('juval-theo-lang', newLang);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('juval-theo-user');
    setCurrentPage('login');
  };

  const checkPin = (digit: string) => {
    const newPin = pin + digit;
    if (newPin.length <= 4) setPin(newPin);
    if (newPin.length === 4) {
      const correctPin = loginTarget === 'Dad' ? '0000' : '5555';
      if (newPin === correctPin) {
        setUser(loginTarget);
        localStorage.setItem('juval-theo-user', loginTarget!);
        setCurrentPage('home');
        setLoginTarget(null);
        setPin('');
      } else {
        setPin('');
        alert(lang === 'es' ? '¡Código incorrecto!' : 'Wrong code!');
      }
    }
  };

  const handleDeletePost = useCallback((postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    setSelectedPost(current => (current?.id === postId ? null : current));
    setCurrentPage(prev => (prev === 'detail' || prev === 'latest' ? 'home' : prev));
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const filePromises = Array.from(files).map((file: File) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });
    const base64Images = await Promise.all(filePromises);
    setPendingImages(base64Images);
    setUploadDate(new Date().toISOString().split('T')[0]);
  };

  const submitAdventure = async () => {
    if (pendingImages.length === 0 || !user) return;
    setUploadStatus('uploading');
    try {
      const content = await generateBilingualPost(pendingImages, user, userContext, taggedBoys);
      // Create a localized date string from the picker value
      const dateParts = uploadDate.split('-');
      const formattedDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2])).toLocaleDateString();

      const newPost: Post = {
        id: Date.now().toString(),
        images: pendingImages,
        en: content.en,
        es: content.es,
        date: formattedDate,
        author: user,
        tags: ['Moment', user, ...taggedBoys]
      };
      setPosts(prev => [newPost, ...prev].slice(0, MAX_POSTS_IN_STORAGE));
      setUploadStatus('success');
      setTimeout(() => {
        setPendingImages([]);
        setUserContext('');
        setTaggedBoys([]);
        setCurrentPage('home');
        setUploadStatus('idle');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 1500);
    } catch (error) {
      setUploadStatus('idle');
      alert('Error saving memory.');
    }
  };

  const openPostDetail = useCallback((post: Post) => {
    setSelectedPost(post);
    setCurrentPage('detail');
    window.scrollTo(0, 0);
  }, []);

  // MEMOIZED BACKGROUND: Prevents "crazy" re-randomizing on every render (like typing)
  const backgroundItems = useMemo(() => {
    const items = [];
    const seed = theme.length; // Simple seed for basic randomization consistency
    if (theme === 'sunny') {
      // Very Slow Drift: 240s to 480s (4-8 minutes)
      for (let i = 0; i < 4; i++) {
        const top = 15 + i * 20;
        const width = 300 + (i * 50) % 150;
        const duration = 240 + (i * 40) % 240;
        const delay = -(i * 60) % 300;
        items.push(<div key={`c-${i}`} className="bg-cloud shadow-md" style={{ top: `${top}%`, width: `${width}px`, height: `${width/2.5}px`, animationDuration: `${duration}s`, animationDelay: `${delay}s` }} />);
      }
    } else if (theme === 'park' || theme === 'home') {
      // Very Gentle Fall: 120s to 240s
      for (let i = 0; i < 6; i++) {
        const left = (i * 17) % 100;
        const duration = 120 + (i * 25) % 120;
        const delay = -(i * 40) % 180;
        items.push(<div key={`l-${i}`} className="bg-leaf" style={{ left: `${left}%`, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}>{i % 2 === 0 ? '🍃' : '🌼'}</div>);
      }
    } else if (theme === 'evening') {
      // Extremely Slow Shimmer: 40s to 80s
      for (let i = 0; i < 15; i++) {
        const top = (i * 13) % 100;
        const left = (i * 23) % 100;
        const duration = 40 + (i * 7) % 40;
        const delay = -(i * 10) % 60;
        items.push(<div key={`s-${i}`} className="bg-star" style={{ top: `${top}%`, left: `${left}%`, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}>✦</div>);
      }
    }
    return items;
  }, [theme]);

  const renderBackground = () => (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {backgroundItems}
    </div>
  );

  const themeClasses = { 
    sunny: 'bg-[#fefce8]', 
    evening: 'bg-[#0f172a]', 
    park: 'bg-[#f0fdf4]', 
    home: 'bg-[#fff7ed]'
  };

  if (!user && currentPage !== 'login') {
    return (
      <div className={`min-h-screen ${themeClasses[theme]} flex flex-col items-center justify-center`}>
        <div className="bg-white cartoon-border p-12 rounded-[50px] text-center animate-fade-in shadow-2xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-200 rounded-full opacity-50 blur-2xl" />
          <h1 className="text-4xl font-black text-slate-800 mb-8 uppercase relative z-10">Our Family Album</h1>
          <button onClick={() => setCurrentPage('login')} className="bg-amber-400 text-slate-800 cartoon-border px-12 py-6 rounded-3xl font-black text-2xl uppercase cartoon-button relative z-10">
            Open Album 📖
          </button>
        </div>
      </div>
    );
  }

  const renderCurrentPageContent = () => {
    switch (currentPage) {
      case 'login':
        return (
          <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
            {!loginTarget ? (
              <>
                <h2 className="text-6xl font-black text-slate-800 mb-12 uppercase text-center drop-shadow-lg">{t.whoAreYou}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-4xl">
                  <button onClick={() => setLoginTarget('Dad')} className="bg-sky-500 cartoon-border p-12 rounded-[50px] hover:scale-105 active:scale-95 group transition-all">
                    <span className="text-9xl mb-6 block group-hover:animate-float">🧔</span>
                    <h4 className="text-4xl font-black text-white uppercase">{t.dadCorner}</h4>
                  </button>
                  <button onClick={() => setLoginTarget('Mom')} className="bg-rose-400 cartoon-border p-12 rounded-[50px] hover:scale-105 active:scale-95 group transition-all">
                    <span className="text-9xl mb-6 block group-hover:animate-float">👩</span>
                    <h4 className="text-4xl font-black text-white uppercase">{t.momCorner}</h4>
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-white cartoon-border p-10 rounded-[50px] w-full max-w-md text-center animate-fade-in shadow-2xl">
                <h3 className="text-4xl font-black mb-2 uppercase text-slate-800">{loginTarget === 'Dad' ? t.dadCorner : t.momCorner}</h3>
                <p className="text-xl font-bold text-slate-500 mb-8 italic">{t.enterPin}</p>
                <div className="flex justify-center gap-6 mb-12">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`w-10 h-10 rounded-full border-[8px] border-slate-800 transition-all ${pin.length > i ? 'bg-slate-800 scale-125' : 'bg-white'}`} />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-6 max-w-sm mx-auto">
                  {['1','2','3','4','5','6','7','8','9','C','0','←'].map((key) => (
                    <button key={key} onClick={() => { if (key === 'C') setPin(''); else if (key === '←') setPin(pin.slice(0, -1)); else checkPin(key); }} className="aspect-square bg-white border-[6px] border-slate-800 shadow-[4px_4px_0px_#1e293b] flex items-center justify-center text-4xl font-black text-slate-800 hover:bg-amber-400 active:translate-y-1 transition-all rounded-[24px]">{key}</button>
                  ))}
                </div>
                <button onClick={() => setLoginTarget(null)} className="mt-12 text-slate-800 hover:text-red-600 font-black text-xl uppercase transition-all">{t.back}</button>
              </div>
            )}
          </div>
        );
      case 'home':
        const [latest, ...archives] = filteredPosts;
        return (
          <div className="py-10 px-4 max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <h1 className={`text-6xl md:text-8xl font-black ${theme === 'evening' ? 'text-white' : 'text-slate-800'} uppercase mb-4 drop-shadow-xl tracking-tighter`}>{t.club}</h1>
              <p className={`text-2xl ${theme === 'evening' ? 'text-slate-300' : 'text-slate-500'} font-black italic`}>{t.welcome}</p>
            </div>
            
            <HeroAlbum posts={posts} activeFilter={heroFilter} onFilterChange={setHeroFilter} lang={lang} />

            {latest ? (
              <div className="mb-24 animate-fade-in">
                <div className="inline-block bg-amber-500 text-white cartoon-border px-8 py-3 rounded-2xl text-2xl font-black uppercase mb-6 transform -rotate-1 shadow-lg">{t.fresh}</div>
                <PostCard post={latest} variant="large" lang={lang} onDelete={handleDeletePost} onOpen={openPostDetail} />
              </div>
            ) : (
              <div className={`text-center py-20 font-black text-3xl opacity-50 uppercase ${theme === 'evening' ? 'text-white' : 'text-slate-800'}`}>No memories yet...</div>
            )}
            {archives.length > 0 && (
              <div className="pb-20">
                <h3 className={`text-4xl font-black ${theme === 'evening' ? 'text-white' : 'text-slate-800'} mb-12 uppercase text-center md:text-left`}>{t.archives}</h3>
                <div className="flex flex-col gap-16">
                  {archives.map(post => <PostCard key={post.id} post={post} lang={lang} onDelete={handleDeletePost} onOpen={openPostDetail} />)}
                </div>
              </div>
            )}
          </div>
        );
      case 'upload':
        return (
          <div className="py-10 px-4 max-w-4xl mx-auto">
            {pendingImages.length === 0 ? (
              <div className="text-center animate-fade-in">
                <h2 className={`text-5xl font-black mb-4 uppercase ${theme === 'evening' ? 'text-white' : 'text-slate-800'}`}>Add Memory</h2>
                <p className={`text-xl font-bold mb-12 italic ${theme === 'evening' ? 'text-slate-300' : 'text-slate-500'}`}>{t.multipleHint}</p>
                <label className="cursor-pointer group block">
                  <div className={`cartoon-border p-16 rounded-[50px] transition-all group-hover:scale-105 shadow-2xl ${user === 'Dad' ? 'bg-sky-500' : 'bg-rose-400'}`}>
                    <span className="text-9xl mb-6 block group-hover:animate-float">{user === 'Dad' ? '🧔' : '👩'}</span>
                    <h4 className="text-4xl font-black text-white uppercase">{user === 'Dad' ? t.dadCorner : t.momCorner}</h4>
                    <div className="mt-8 bg-white text-slate-800 px-8 py-4 rounded-3xl font-black text-xl uppercase cartoon-border inline-block hover:bg-amber-400 transition-colors">✨ Choose Photos</div>
                  </div>
                  <input type="file" multiple className="hidden" accept="image/*" onChange={handleFileSelect} />
                </label>
                <button onClick={() => setCurrentPage('home')} className={`mt-16 font-black text-2xl uppercase transition-all hover:scale-110 ${theme === 'evening' ? 'text-white' : 'text-slate-800'}`}>{t.back}</button>
              </div>
            ) : (
              <div className="animate-fade-in pb-24">
                <h2 className={`text-4xl font-black uppercase mb-8 ${theme === 'evening' ? 'text-white' : 'text-slate-800'}`}>{t.tellStory}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {pendingImages.map((img, i) => <div key={i} className="aspect-square cartoon-border rounded-2xl overflow-hidden bg-white shadow-md hover:scale-105 transition-transform"><img src={img} className="w-full h-full object-cover" alt="p" /></div>)}
                </div>
                
                {/* Date Selection Feature */}
                <div className="bg-white/90 cartoon-border p-8 rounded-[40px] mb-8 shadow-xl">
                  <h3 className="text-2xl font-black text-slate-800 uppercase mb-4 text-center">{t.selectDate}</h3>
                  <input 
                    type="date" 
                    value={uploadDate} 
                    onChange={(e) => setUploadDate(e.target.value)}
                    className="w-full bg-slate-50 cartoon-border px-6 py-4 rounded-3xl text-2xl font-black text-slate-800 focus:outline-none focus:bg-amber-50 transition-colors cursor-pointer"
                  />
                </div>

                <div className="bg-white/90 cartoon-border p-8 rounded-[40px] mb-8 shadow-xl">
                  <h3 className="text-2xl font-black text-slate-800 uppercase mb-4 text-center">{t.selectHeroes}</h3>
                  <div className="flex justify-center gap-6">
                    {['Juval', 'Theo'].map(boy => (
                      <button key={boy} onClick={() => setTaggedBoys(prev => prev.includes(boy) ? prev.filter(b => b !== boy) : [...prev, boy])} className={`cartoon-border px-8 py-4 rounded-3xl text-xl font-black transition-all active:scale-95 ${taggedBoys.includes(boy) ? (boy === 'Juval' ? 'bg-sky-400' : 'bg-rose-400') + ' text-white scale-110 shadow-lg' : 'bg-white text-slate-400 opacity-60'}`}>
                        {boy === 'Juval' ? '👦 ' : '👶 '}{boy.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-white cartoon-border p-6 rounded-[30px] mb-12 shadow-xl"><textarea className="w-full h-48 p-4 text-2xl font-semibold text-slate-700 focus:outline-none bg-transparent resize-none placeholder:text-slate-200" placeholder={t.placeholderContext} value={userContext} onChange={(e) => setUserContext(e.target.value)} /></div>
                <div className="text-center flex flex-col gap-6">
                  <button onClick={submitAdventure} className="bg-rose-500 text-white cartoon-border px-16 py-8 rounded-[40px] text-4xl font-black cartoon-button mx-auto shadow-2xl">{t.startMission}</button>
                  <button onClick={() => setPendingImages([])} className={`font-black uppercase text-xl transition-all hover:scale-110 ${theme === 'evening' ? 'text-white hover:text-rose-400' : 'text-slate-800 hover:text-rose-600'}`}>Reset Selection</button>
                </div>
              </div>
            )}
          </div>
        );
      case 'detail':
        return (
          <div className="py-10 px-4 max-w-5xl mx-auto animate-fade-in">
            <button onClick={() => setCurrentPage('home')} className="bg-white text-slate-800 cartoon-border px-8 py-4 rounded-2xl font-black text-xl mb-12 cartoon-button shadow-md">{t.back}</button>
            {selectedPost ? <PostCard post={selectedPost} variant="large" lang={lang} onDelete={handleDeletePost} /> : <div className="text-white text-center text-2xl">Missing moment.</div>}
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className={`min-h-screen pb-32 relative transition-colors duration-1000 ${themeClasses[theme]}`}>
      {renderBackground()}
      {user && (
        <nav className="bg-white/95 backdrop-blur-md border-b-4 border-slate-800 p-5 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div onClick={() => setCurrentPage('home')} className="flex items-center gap-3 cartoon-button cursor-pointer group">
              <div className="bg-amber-400 p-3 rounded-2xl border-4 border-slate-800 transform group-hover:rotate-12 transition-transform shadow-md"><span className="text-3xl font-black text-slate-800">JT</span></div>
              <span className="hidden sm:block text-2xl font-black text-slate-800 uppercase ml-2 tracking-tighter">{t.club}</span>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={toggleLanguage} className="bg-slate-100 text-slate-800 cartoon-border px-4 py-2 rounded-xl font-black text-sm uppercase hover:bg-slate-200 transition-colors shadow-sm">{lang === 'en' ? 'ES 🇪🇸' : 'EN 🇺🇸'}</button>
              <button onClick={handleLogout} className="text-slate-400 font-black text-sm uppercase ml-4 hover:text-red-600 transition-colors">Logout</button>
            </div>
          </div>
        </nav>
      )}
      <main className="relative z-10">{renderCurrentPageContent()}</main>
      {user && currentPage !== 'upload' && uploadStatus === 'idle' && (
        <button onClick={() => setCurrentPage('upload')} className="fixed bottom-10 right-10 w-24 h-24 bg-rose-500 text-white rounded-full flex items-center justify-center text-5xl cartoon-border z-40 hover:scale-110 active:scale-95 shadow-2xl transition-all">✨</button>
      )}
      {uploadStatus !== 'idle' && (
        <div className="fixed inset-0 bg-amber-400/95 z-[100] flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in">
          <div className="bg-white cartoon-border p-12 rounded-[60px] animate-bounce text-center max-w-md shadow-[20px_20px_0px_#1e293b]">
            {uploadStatus === 'uploading' ? (
              <><span className="text-8xl block mb-8">💖</span><span className="text-4xl font-black text-slate-800 uppercase tracking-tighter">{t.mixingColors}</span></>
            ) : (
              <><span className="text-8xl block mb-8">📸</span><span className="text-4xl font-black text-green-600 uppercase tracking-tighter">{t.done}</span></>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
