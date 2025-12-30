
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Post, Page, AuthUser, Theme } from './types';
import { INITIAL_POSTS } from './constants';
import PostCard from './components/PostCard';
import HeroAlbum from './components/HeroRadar';
import { generateBilingualPost } from './services/geminiService';
import SettingsPage from './components/SettingsPage';
import { migrateAuthIfNeeded, verifyLogin, needsPinUpdate } from './services/authService';
import { compressImages } from './utils/imageCompression';
import { getPosts, addPost, deletePost as deleteFirestorePost } from './services/firestoreService';
import { uploadImages, deleteImages, uploadMedia, deleteMedia } from './services/storageService';

const MAX_POSTS_IN_STORAGE = 12;
const THEMES: Theme[] = ['space', 'ocean', 'jungle', 'sports', 'pokemon', 'dinosaur'];

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [user, setUser] = useState<AuthUser>(null);
  const [pin, setPin] = useState('');
  const [loginTarget, setLoginTarget] = useState<AuthUser>(null);
  const [theme, setTheme] = useState<Theme>('space');
  const [heroFilter, setHeroFilter] = useState('all');
  const [showPinWarning, setShowPinWarning] = useState(false);
  
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]); // New: store actual File objects
  const [userContext, setUserContext] = useState('');
  const [taggedBoys, setTaggedBoys] = useState<string[]>([]);
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);

  const initialized = useRef(false);

  const t = {
    club: lang === 'es' ? 'Juval & Theo' : 'Juval & Theo',
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
    // Check and migrate auth system
    const initAuth = async () => {
      try {
        await migrateAuthIfNeeded();

        const needsUpdate = await needsPinUpdate();
        if (needsUpdate && user) {
          setShowPinWarning(true);
        }
      } catch (error) {
        console.error("[AUTH] initialization failed:", error);
      }
    };

    initAuth();

    // Pick a random theme once on load
    const randomTheme = THEMES[Math.floor(Math.random() * THEMES.length)];
    setTheme(randomTheme);

    // Load user preferences from localStorage (auth and language)
    try {
      const savedLang = localStorage.getItem('juval-theo-lang');
      const savedUser = localStorage.getItem('juval-theo-user') as AuthUser;

      if (savedLang === 'en' || savedLang === 'es') setLang(savedLang);
      if (savedUser) setUser(savedUser);
    } catch (e) {
      console.error('[INIT] Failed to load user preferences', e);
    }

    // Load posts from Firebase
    const loadPosts = async () => {
      try {
        console.log('[INIT] Loading posts from Firebase...');
        const firebasePosts = await getPosts(MAX_POSTS_IN_STORAGE);

        if (firebasePosts.length > 0) {
          setPosts(firebasePosts);
          console.log('[INIT] Loaded', firebasePosts.length, 'posts from Firebase');
        } else {
          // No posts yet, show initial posts as examples
          setPosts(INITIAL_POSTS);
          console.log('[INIT] No posts in Firebase, showing initial posts');
        }
      } catch (error) {
        console.error('[INIT] Failed to load posts from Firebase:', error);
        setPosts(INITIAL_POSTS);
      }
    };

    loadPosts();
    initialized.current = true;
  }, []);

  // No longer need to sync posts to localStorage - Firebase handles persistence

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

  const checkPin = async (digit: string) => {
    const newPin = pin + digit;
    if (newPin.length <= 4) setPin(newPin);
    if (newPin.length === 4) {
      // Rate limiting: Check for too many failed attempts
      const LOCKOUT_KEY = 'juval-theo-lockout';
      const ATTEMPTS_KEY = 'juval-theo-attempts';
      const MAX_ATTEMPTS = 5;
      const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

      const lockoutUntil = localStorage.getItem(LOCKOUT_KEY);
      if (lockoutUntil && Date.now() < parseInt(lockoutUntil)) {
        const minutesLeft = Math.ceil((parseInt(lockoutUntil) - Date.now()) / 60000);
        alert(lang === 'es'
          ? `Demasiados intentos. Intenta en ${minutesLeft} minutos`
          : `Too many attempts. Try again in ${minutesLeft} minutes`);
        setPin('');
        return;
      }

      const isValid = await verifyLogin(loginTarget!, newPin);
      if (isValid) {
        // Success - clear attempts
        localStorage.removeItem(ATTEMPTS_KEY);
        localStorage.removeItem(LOCKOUT_KEY);

        setUser(loginTarget);
        localStorage.setItem('juval-theo-user', loginTarget!);

        // Check if user needs to update PIN
        const needsUpdate = await needsPinUpdate();
        if (needsUpdate) {
          setCurrentPage('settings');
        } else {
          setCurrentPage('home');
        }

        setLoginTarget(null);
        setPin('');
      } else {
        // Failed attempt - track it
        const attempts = parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0') + 1;
        localStorage.setItem(ATTEMPTS_KEY, attempts.toString());

        if (attempts >= MAX_ATTEMPTS) {
          const lockoutUntil = Date.now() + LOCKOUT_TIME;
          localStorage.setItem(LOCKOUT_KEY, lockoutUntil.toString());
          alert(lang === 'es'
            ? 'Demasiados intentos fallidos. Espera 15 minutos'
            : 'Too many failed attempts. Wait 15 minutes');
          localStorage.setItem(ATTEMPTS_KEY, '0');
        } else {
          const remaining = MAX_ATTEMPTS - attempts;
          alert(lang === 'es'
            ? `¡Código incorrecto! ${remaining} intentos restantes`
            : `Wrong code! ${remaining} attempts remaining`);
        }

        setPin('');
      }
    }
  };

  const handleDeletePost = useCallback(async (postId: string) => {
    try {
      // Find the post to get image URLs
      const post = posts.find(p => p.id === postId);

      if (post) {
        // Delete images from Firebase Storage
        await deleteImages(post.images);

        // Delete post from Firestore
        await deleteFirestorePost(postId);

        // Update local state
        setPosts(prev => prev.filter(p => p.id !== postId));
        setSelectedPost(current => (current?.id === postId ? null : current));
        setCurrentPage(prev => (prev === 'detail' || prev === 'latest' ? 'home' : prev));

        console.log('[DELETE] Post deleted successfully:', postId);
      }
    } catch (error) {
      console.error('[DELETE] Failed to delete post:', error);
      alert(lang === 'es'
        ? 'Error al borrar el recuerdo. Intenta de nuevo.'
        : 'Error deleting memory. Please try again.');
    }
  }, [posts, lang]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    // Validation: Maximum 10 files per upload
    if (fileArray.length > 10) {
      alert(lang === 'es'
        ? 'Máximo 10 archivos por publicación'
        : 'Maximum 10 files per post');
      e.target.value = '';
      return;
    }

    // Validation: Maximum file size 100MB
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    const oversizedFile = fileArray.find(file => file.size > MAX_FILE_SIZE);
    if (oversizedFile) {
      alert(lang === 'es'
        ? `Archivo muy grande: ${oversizedFile.name}. Máximo 100MB`
        : `File too large: ${oversizedFile.name}. Maximum 100MB`);
      e.target.value = '';
      return;
    }

    // Validation: Only images and videos
    const invalidFile = fileArray.find(file =>
      !file.type.startsWith('image/') && !file.type.startsWith('video/')
    );
    if (invalidFile) {
      alert(lang === 'es'
        ? `Tipo de archivo no válido: ${invalidFile.name}`
        : `Invalid file type: ${invalidFile.name}`);
      e.target.value = '';
      return;
    }

    setPendingFiles(fileArray); // Store File objects for upload

    // Create preview URLs for display
    const previewPromises = fileArray.map((file: File) => {
      return new Promise<string>((resolve) => {
        if (file.type.startsWith('video/')) {
          // For videos, create object URL for preview
          resolve(URL.createObjectURL(file));
        } else {
          // For images, read as base64 and compress
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = reader.result as string;
            const compressed = await compressImages([base64], 800, 0.7);
            resolve(compressed[0]);
          };
          reader.readAsDataURL(file);
        }
      });
    });

    const previews = await Promise.all(previewPromises);
    setPendingImages(previews);
    setUploadDate(new Date().toISOString().split('T')[0]);
  };

  const submitAdventure = async () => {
    if (pendingImages.length === 0 || !user) return;
    setUploadStatus('uploading');
    try {
      console.log('[SUBMIT] Generating content with AI...');
      // For AI generation, only pass image previews (not videos)
      const imagePreviewsOnly = pendingImages.filter((_, idx) => !pendingFiles[idx]?.type.startsWith('video/'));
      const content = await generateBilingualPost(imagePreviewsOnly.length > 0 ? imagePreviewsOnly : pendingImages, user, userContext, taggedBoys);

      // Create a localized date string from the picker value
      const dateParts = uploadDate.split('-');
      const formattedDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2])).toLocaleDateString();

      // Generate temporary ID for the post (will be replaced by Firestore)
      const tempId = Date.now().toString();

      console.log('[SUBMIT] Uploading media to Firebase Storage...');
      // Upload media (images and videos) to Firebase Storage and get MediaItems
      const mediaItems = await uploadMedia(pendingFiles, tempId);

      // Extract URLs for backward compatibility
      const imageUrls = mediaItems.map(item => item.url);

      console.log('[SUBMIT] Saving post to Firestore...');
      // Save post to Firestore
      const postId = await addPost({
        images: imageUrls, // Store URLs for backward compatibility
        media: mediaItems, // Store media items with type info
        en: content.en,
        es: content.es,
        date: formattedDate,
        author: user,
        tags: ['Moment', user, ...taggedBoys]
      });

      // Create the post object with the Firestore ID
      const newPost: Post = {
        id: postId,
        images: imageUrls,
        media: mediaItems,
        en: content.en,
        es: content.es,
        date: formattedDate,
        author: user,
        tags: ['Moment', user, ...taggedBoys]
      };

      // Update local state
      setPosts(prev => [newPost, ...prev]);

      console.log('[SUBMIT] Post saved successfully:', postId);
      setUploadStatus('success');

      setTimeout(() => {
        setPendingImages([]);
        setPendingFiles([]);
        setUserContext('');
        setTaggedBoys([]);
        setCurrentPage('home');
        setUploadStatus('idle');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 1500);
    } catch (error) {
      console.error('[SUBMIT] Error saving post:', error);
      setUploadStatus('idle');
      alert(lang === 'es'
        ? 'Error al guardar el recuerdo. Intenta de nuevo.'
        : 'Error saving memory. Please try again.');
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
    if (theme === 'space') {
      // Space: Stars, planets, and shooting stars
      for (let i = 0; i < 20; i++) {
        const top = (i * 13) % 100;
        const left = (i * 23) % 100;
        const duration = 40 + (i * 7) % 40;
        const delay = -(i * 10) % 60;
        items.push(<div key={`s-${i}`} className="bg-star" style={{ top: `${top}%`, left: `${left}%`, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}>✦</div>);
      }
      // Add planets
      const planets = ['🪐', '🌎', '🌙'];
      for (let i = 0; i < 3; i++) {
        const top = 20 + i * 25;
        const duration = 180 + i * 60;
        items.push(<div key={`p-${i}`} className="bg-planet" style={{ top: `${top}%`, animationDuration: `${duration}s` }}>{planets[i]}</div>);
      }
    } else if (theme === 'ocean') {
      // Ocean: Fish and bubbles
      const fish = ['🐠', '🐟', '🐡', '🦈', '🐙'];
      for (let i = 0; i < 8; i++) {
        const left = (i * 15) % 100;
        const duration = 15 + (i * 5) % 20;
        const delay = -(i * 3) % 15;
        items.push(<div key={`f-${i}`} className="bg-fish" style={{ left: `${left}%`, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}>{fish[i % fish.length]}</div>);
      }
      // Add bubbles
      for (let i = 0; i < 12; i++) {
        const left = (i * 11) % 100;
        const duration = 8 + (i * 2) % 8;
        const delay = -(i * 2) % 10;
        items.push(<div key={`b-${i}`} className="bg-bubble" style={{ left: `${left}%`, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}>○</div>);
      }
    } else if (theme === 'jungle') {
      // Jungle: Safari animals and leaves
      const animals = ['🦁', '🐘', '🦒', '🦓', '🐵', '🦜'];
      for (let i = 0; i < 6; i++) {
        const left = (i * 18) % 100;
        const duration = 25 + (i * 5) % 15;
        const delay = -(i * 4) % 20;
        items.push(<div key={`a-${i}`} className="bg-animal" style={{ left: `${left}%`, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}>{animals[i]}</div>);
      }
      // Add leaves
      for (let i = 0; i < 8; i++) {
        const left = (i * 13) % 100;
        const duration = 120 + (i * 25) % 60;
        const delay = -(i * 30) % 100;
        items.push(<div key={`l-${i}`} className="bg-leaf" style={{ left: `${left}%`, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}>🍃</div>);
      }
    } else if (theme === 'sports') {
      // Sports: Bouncing balls
      const balls = ['⚽', '🏀', '🏈', '⚾', '🎾'];
      for (let i = 0; i < 8; i++) {
        const left = (i * 14) % 100;
        const duration = 3 + (i * 0.5) % 2;
        const delay = -(i * 0.5) % 3;
        items.push(<div key={`ball-${i}`} className="bg-ball" style={{ left: `${left}%`, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}>{balls[i % balls.length]}</div>);
      }
    } else if (theme === 'pokemon') {
      // Pokemon: Flying and walking Pokemon
      const flyingPokemon = ['🦅', '🦋', '🐉', '🦇'];
      const walkingPokemon = ['⚡', '🔥', '💧', '🌿', '⭐'];
      // Flying Pokemon
      for (let i = 0; i < 6; i++) {
        const top = (i * 18) % 80;
        const duration = 20 + (i * 5) % 15;
        const delay = -(i * 4) % 20;
        items.push(<div key={`fp-${i}`} className="bg-pokemon-fly" style={{ top: `${top}%`, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}>{flyingPokemon[i % flyingPokemon.length]}</div>);
      }
      // Pokeballs bouncing
      for (let i = 0; i < 5; i++) {
        const left = (i * 20) % 100;
        const duration = 4 + (i * 0.5) % 2;
        const delay = -(i * 0.8) % 4;
        items.push(<div key={`pb-${i}`} className="bg-pokeball" style={{ left: `${left}%`, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}>⚪</div>);
      }
      // Element symbols floating
      for (let i = 0; i < 8; i++) {
        const top = (i * 15) % 100;
        const left = (i * 13) % 100;
        const duration = 30 + (i * 5) % 20;
        const delay = -(i * 5) % 25;
        items.push(<div key={`elem-${i}`} className="bg-pokemon-element" style={{ top: `${top}%`, left: `${left}%`, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}>{walkingPokemon[i % walkingPokemon.length]}</div>);
      }
    } else if (theme === 'dinosaur') {
      // Dinosaur: Walking dinos and prehistoric elements
      const dinos = ['🦕', '🦖', '🦴', '🥚'];
      const prehistoric = ['🌋', '🌴', '🪨', '🦴'];
      // Walking dinosaurs
      for (let i = 0; i < 6; i++) {
        const top = 60 + (i * 8) % 30;
        const duration = 25 + (i * 5) % 15;
        const delay = -(i * 5) % 20;
        items.push(<div key={`dino-${i}`} className="bg-dino-walk" style={{ top: `${top}%`, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}>{dinos[i % dinos.length]}</div>);
      }
      // Flying pterodactyls
      for (let i = 0; i < 4; i++) {
        const top = 10 + (i * 15) % 40;
        const duration = 18 + (i * 3) % 12;
        const delay = -(i * 4) % 15;
        items.push(<div key={`ptero-${i}`} className="bg-pterodactyl" style={{ top: `${top}%`, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}>🦅</div>);
      }
      // Falling meteors/rocks
      for (let i = 0; i < 5; i++) {
        const left = (i * 22) % 100;
        const duration = 8 + (i * 2) % 6;
        const delay = -(i * 3) % 10;
        items.push(<div key={`meteor-${i}`} className="bg-meteor" style={{ left: `${left}%`, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}>☄️</div>);
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
    space: 'bg-[#0f172a]',     // Dark space blue
    ocean: 'bg-[#0ea5e9]',     // Ocean blue
    jungle: 'bg-[#15803d]',    // Jungle green
    sports: 'bg-[#38bdf8]',    // Sports sky blue
    pokemon: 'bg-[#fee140]',   // Pokemon yellow
    dinosaur: 'bg-[#c2410c]'   // Prehistoric orange/brown
  };

  // No auth gate - let everyone view the album!

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
                    <span className="text-9xl mb-6 block group-hover:animate-float">🧔🏽</span>
                    <h4 className="text-4xl font-black text-white uppercase">{t.dadCorner}</h4>
                  </button>
                  <button onClick={() => setLoginTarget('Mom')} className="bg-rose-400 cartoon-border p-12 rounded-[50px] hover:scale-105 active:scale-95 group transition-all">
                    <span className="text-9xl mb-6 block group-hover:animate-float">👩🏽</span>
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
                <PostCard post={latest} variant="large" lang={lang} onDelete={user ? handleDeletePost : undefined} onOpen={openPostDetail} />
              </div>
            ) : (
              <div className={`text-center py-20 font-black text-3xl opacity-50 uppercase ${theme === 'evening' ? 'text-white' : 'text-slate-800'}`}>No memories yet...</div>
            )}
            {archives.length > 0 && (
              <div className="pb-20">
                <h3 className={`text-4xl font-black ${theme === 'evening' ? 'text-white' : 'text-slate-800'} mb-12 uppercase text-center md:text-left`}>{t.archives}</h3>
                <div className="flex flex-col gap-16">
                  {archives.map(post => <PostCard key={post.id} post={post} lang={lang} onDelete={user ? handleDeletePost : undefined} onOpen={openPostDetail} />)}
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
                    <span className="text-9xl mb-6 block group-hover:animate-float">{user === 'Dad' ? '🧔🏽' : '👩🏽'}</span>
                    <h4 className="text-4xl font-black text-white uppercase">{user === 'Dad' ? t.dadCorner : t.momCorner}</h4>
                    <div className="mt-8 bg-white text-slate-800 px-8 py-4 rounded-3xl font-black text-xl uppercase cartoon-border inline-block hover:bg-amber-400 transition-colors">✨ Choose Photos</div>
                  </div>
                  <input type="file" multiple className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />
                </label>
                <button onClick={() => setCurrentPage('home')} className={`mt-16 font-black text-2xl uppercase transition-all hover:scale-110 ${theme === 'evening' ? 'text-white' : 'text-slate-800'}`}>{t.back}</button>
              </div>
            ) : (
              <div className="animate-fade-in pb-24">
                <h2 className={`text-4xl font-black uppercase mb-8 ${theme === 'evening' ? 'text-white' : 'text-slate-800'}`}>{t.tellStory}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {pendingImages.map((url: string, i: number) => {
                    const isVideo = pendingFiles[i]?.type.startsWith('video/');
                    return (
                      <div key={i} className="aspect-square cartoon-border rounded-2xl overflow-hidden bg-white shadow-md hover:scale-105 transition-transform relative">
                        {isVideo ? (
                          <video src={url} className="w-full h-full object-cover" muted playsInline />
                        ) : (
                          <img src={url} className="w-full h-full object-cover" alt="p" />
                        )}
                        {isVideo && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-4xl">🎬</span></div>}
                      </div>
                    );
                  })}
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
            {selectedPost ? <PostCard post={selectedPost} variant="large" lang={lang} onDelete={user ? handleDeletePost : undefined} /> : <div className="text-white text-center text-2xl">Missing moment.</div>}
          </div>
        );
      case 'settings':
        return user ? (
          <SettingsPage
            lang={lang}
            user={user}
            theme={theme}
            onBack={() => {
              setShowPinWarning(false);
              setCurrentPage('home');
            }}
          />
        ) : null;
      default: return null;
    }
  };

  return (
    <div className={`min-h-screen pb-32 relative transition-colors duration-1000 ${themeClasses[theme]}`}>
      {renderBackground()}
      <nav className="bg-white/95 backdrop-blur-md border-b-4 border-slate-800 p-5 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div onClick={() => setCurrentPage('home')} className="flex items-center gap-3 cartoon-button cursor-pointer group">
            <div className="bg-amber-400 p-3 rounded-2xl border-4 border-slate-800 transform group-hover:rotate-12 transition-transform shadow-md"><span className="text-3xl font-black text-slate-800">JT</span></div>
            <span className="hidden sm:block text-2xl font-black text-slate-800 uppercase ml-2 tracking-tighter">{t.club}</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleLanguage} className="bg-slate-100 text-slate-800 cartoon-border px-4 py-2 rounded-xl font-black text-sm uppercase hover:bg-slate-200 transition-colors shadow-sm">{lang === 'en' ? 'ES 🇪🇸' : 'EN 🇺🇸'}</button>
            {user ? (
              <>
                <button
                  onClick={() => setCurrentPage('settings')}
                  className="bg-slate-100 text-slate-800 cartoon-border px-4 py-2 rounded-xl font-black text-sm uppercase hover:bg-slate-200 transition-colors shadow-sm"
                  title={lang === 'es' ? 'Configuración' : 'Settings'}
                >
                  ⚙️
                </button>
                <button onClick={handleLogout} className="text-slate-400 font-black text-sm uppercase ml-4 hover:text-red-600 transition-colors">Logout</button>
              </>
            ) : (
              <button
                onClick={() => setCurrentPage('login')}
                className="bg-sky-500 text-white cartoon-border px-6 py-2 rounded-xl font-black text-sm uppercase hover:bg-sky-600 transition-colors shadow-sm"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </nav>
      {showPinWarning && user && (
        <div className="bg-amber-400 border-b-4 border-slate-800 p-4 text-center sticky top-[72px] z-40 animate-fade-in">
          <p className="text-slate-800 font-black text-lg">
            {lang === 'es'
              ? '⚠️ Por favor cambia tu código secreto en Configuración'
              : '⚠️ Please change your secret code in Settings'}
          </p>
          <button
            onClick={() => {
              setShowPinWarning(false);
              setCurrentPage('settings');
            }}
            className="bg-slate-800 text-white px-6 py-2 rounded-xl font-black text-sm uppercase mt-2 hover:bg-slate-700 transition-colors"
          >
            {lang === 'es' ? 'Ir a Configuración' : 'Go to Settings'}
          </button>
        </div>
      )}
      <main className="relative z-10">{renderCurrentPageContent()}</main>
      {currentPage !== 'upload' && currentPage !== 'login' && uploadStatus === 'idle' && (
        <button
          onClick={() => {
            if (user) {
              setCurrentPage('upload');
            } else {
              setCurrentPage('login');
            }
          }}
          className="fixed bottom-10 right-10 w-24 h-24 bg-rose-500 text-white rounded-full flex items-center justify-center text-5xl cartoon-border z-40 hover:scale-110 active:scale-95 shadow-2xl transition-all"
        >
          ✨
        </button>
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
