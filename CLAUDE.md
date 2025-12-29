# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a bilingual (English/Spanish) family photo album web app for documenting the adventures of two brothers, Juval and Theo. The app features AI-generated captions using Google Gemini, cloud storage via Firebase, and a playful, cartoon-style UI.

**Key Technologies:**
- React 19 with TypeScript
- Vite for build tooling
- Firebase (Firestore + Storage)
- Google Gemini AI for caption generation
- Tailwind CSS (via CDN in index.html)
- bcryptjs for client-side PIN authentication

**Deployment:**
- GitHub Actions automatically builds and deploys to GitHub Pages
- Custom domain: juvalandtheo.com
- Environment variables configured via GitHub Secrets

## Common Commands

```bash
# Development
npm run dev          # Start dev server at http://localhost:3000

# Build & Deploy
npm run build        # Production build to /dist
npm run preview      # Preview production build locally
npm run deploy       # Build and deploy to GitHub Pages (requires gh-pages setup)
```

## Environment Setup

Create a `.env` file based on `.env.example`:

```bash
# Required API keys
GEMINI_API_KEY=         # From https://aistudio.google.com/app/apikey
FIREBASE_API_KEY=       # Firebase config values
FIREBASE_AUTH_DOMAIN=   # from Firebase Console >
FIREBASE_PROJECT_ID=    # Project Settings >
FIREBASE_STORAGE_BUCKET=  # SDK setup
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
```

**For deployment:** Add all environment variables as GitHub Secrets in repo settings.

## Architecture

### Data Flow

```
User Upload → Image Compression → Firebase Storage (CDN URLs)
                                         ↓
              Gemini AI ← base64 images (for caption generation)
                 ↓
           Firestore Database ← Post with media URLs + bilingual content
                 ↓
           Real-time sync across all devices
```

### Core Services Layer

**`services/firebase.ts`**
- Initializes Firebase app, Firestore (`db`), and Storage (`storage`)
- Single source of truth for Firebase instances

**`services/firestoreService.ts`**
- `addPost()` - Saves post to Firestore (auto-generates ID)
- `getPosts()` - Retrieves posts ordered by creation date
- `deletePost()` - Removes post from database
- All posts stored in `posts` collection

**`services/storageService.ts`**
- `uploadImage()` - Uploads base64 image to Firebase Storage
- `uploadVideo()` - Uploads video file blob
- `uploadMedia()` - Handles mixed images/videos, returns `MediaItem[]`
- `deleteImages()` / `deleteMedia()` - Cleanup operations
- Files stored at `posts/{postId}/{type}_{index}.{ext}`

**`services/authService.ts`**
- PIN authentication using bcrypt (client-side hashing)
- Auth data stored in Firestore at `settings/auth`
- `migrateAuthIfNeeded()` - Auto-initializes with default PINs (0000/5555)
- `verifyLogin()` - Validates PIN against stored hash
- `updateUserPin()` - Changes user PIN
- **Security note:** Client-side only, suitable for family privacy not production security

**`services/geminiService.ts`**
- `generateBilingualPost()` - Sends images + context to Gemini AI
- Returns structured JSON with `{ en: {title, caption}, es: {title, caption} }`
- Uses `gemini-3-flash-preview` model
- Fallback to generic captions on API failure

### Type System

**`types.ts`** defines core data structures:

```typescript
interface Post {
  id: string;
  images: string[];        // Deprecated - backward compatibility
  media?: MediaItem[];     // New: supports videos
  en: PostContent;         // English title + caption
  es: PostContent;         // Spanish title + caption
  date: string;
  author: 'Dad' | 'Mom';
  tags: string[];         // e.g., ['Juval', 'Theo', 'Dad']
}

interface MediaItem {
  url: string;             // Firebase Storage CDN URL
  type: 'image' | 'video';
}
```

### State Management

**`App.tsx`** is the main container with all application state:
- Posts, current page, user authentication, upload status
- Language toggle (English/Spanish)
- Theme selection (space, ocean, jungle, sports, pokemon, dinosaur)
- Manages routing between pages: home, gallery, upload, detail, login, settings

**Key State Variables:**
- `posts` - Array of all posts (synced from Firestore on mount)
- `user` - Current authenticated user ('Dad' | 'Mom' | null)
- `currentPage` - Active route/view
- `pendingFiles` - File objects selected for upload
- `pendingImages` - Preview URLs for upload UI

### Components

**`components/PostCard.tsx`**
- Renders individual post with image/video carousel
- Supports both `images[]` (legacy) and `media[]` (new)
- Swipe gestures on mobile, arrow buttons on desktop
- Delete confirmation UI

**`components/SettingsPage.tsx`**
- PIN change interface (verify current → enter new → confirm)
- Uses `PinKeypad` component for input

**`components/HeroRadar.tsx`**
- Animated landing screen with theme-based styling
- Filters posts by tagged person (Juval/Theo)

### Media Upload Flow

1. User selects files (images/videos accepted)
2. Files stored in `pendingFiles` state
3. Images compressed to 800px width, 70% quality
4. Videos get object URLs for preview (no compression)
5. On submit:
   - Images converted to base64 for Gemini AI
   - All media uploaded to Firebase Storage via `uploadMedia()`
   - Post saved to Firestore with Firebase CDN URLs
   - Local state updated immediately

### Authentication System

- **Public Access:** Anyone can view posts without login
- **Protected Actions:** Upload, delete, and settings require authentication
- **PIN Storage:** Firestore `settings/auth` document with bcrypt hashes
- **Auto-migration:** First load creates default PINs if none exist
- **PIN Warning:** Shows banner if using default PINs (0000/5555)

### Bilingual Support

All user-facing text uses translation object `t`:
```typescript
const t = {
  welcome: lang === 'es' ? '¡Bienvenidos!' : 'Welcome!',
  // ... etc
}
```

Post content stored with both languages:
```typescript
post.en.title / post.en.caption
post.es.title / post.es.caption
```

## Important Patterns

### Firebase Environment Variables

Vite config defines all Firebase env vars at build time:
```javascript
define: {
  'process.env.FIREBASE_API_KEY': JSON.stringify(env.FIREBASE_API_KEY),
  // ... etc
}
```

### Image Compression

`utils/imageCompression.ts` resizes images client-side before upload to reduce bandwidth and storage costs.

### Error Handling

Services use try-catch with console logging and user-friendly fallbacks (e.g., generic AI captions if Gemini fails).

### Video Support

The app recently added video upload capability:
- Videos stored alongside images in Firebase Storage
- `MediaItem` type distinguishes between images and videos
- `<video>` elements render with controls in PostCard
- Videos NOT sent to Gemini (only images for AI captions)

## File Organization

```
juvalandtheo/
├── App.tsx              # Main app container & routing
├── index.tsx            # React root
├── types.ts             # TypeScript interfaces
├── constants.tsx        # Initial posts (demo data)
├── components/          # React components
├── services/            # Firebase, Gemini, Auth logic
├── utils/               # Image compression utilities
├── .env                 # Local environment variables (gitignored)
├── .env.example         # Template for required env vars
└── vite.config.ts       # Build configuration
```

## Deployment Notes

- GitHub Actions workflow at `.github/workflows/deploy.yml`
- Builds on push to main branch
- Environment variables from GitHub Secrets
- Deploys to `gh-pages` branch
- CNAME record points juvalandtheo.com to GitHub Pages

## Firebase Structure

**Firestore Collections:**
- `posts/` - All photo/video posts
  - Auto-generated document IDs
  - Includes `createdAt` timestamp
- `settings/auth` - Single document with PIN hashes

**Firebase Storage:**
- `posts/{postId}/image_{index}.jpg` - Compressed images
- `posts/{postId}/video_{index}.mp4` - Video files

## Known Limitations

- Client-side authentication (PINs in Firestore, not Firebase Auth)
- No user accounts or registration
- Two hardcoded users: Dad and Mom
- Gemini AI requires valid API key (fallback to generic captions)
- No image optimization on server side (all compression client-side)
