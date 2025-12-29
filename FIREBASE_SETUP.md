# Firebase Setup Guide

This guide will help you set up Firebase for the Juval & Theo Adventure Club app.

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" (or select an existing project)
3. Enter project name: `juval-theo-adventure` (or your preferred name)
4. Disable Google Analytics (optional - not needed for this app)
5. Click "Create project"

## Step 2: Register Your Web App

1. In the Firebase Console, click the **web icon** (`</>`) to add a web app
2. Enter app nickname: `juval-theo-web`
3. **Check** "Also set up Firebase Hosting" (optional but recommended)
4. Click "Register app"
5. You'll see your Firebase configuration - **keep this page open**

## Step 3: Get Your Firebase Configuration

Copy the configuration values from the Firebase Console. You'll see something like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

## Step 4: Enable Firestore Database

1. In the Firebase Console sidebar, click **Firestore Database**
2. Click "Create database"
3. Select **"Start in production mode"** (we'll add security rules next)
4. Choose a Cloud Firestore location (pick one close to your users)
5. Click "Enable"

### Set Security Rules

After creating the database, go to the **Rules** tab and replace with:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Allow anyone to read posts
    match /posts/{postId} {
      allow read: if true;
      // Only allow writes (no auth for now - we use client-side PIN)
      allow create, update, delete: if true;
    }
  }
}
```

Click **Publish** to save the rules.

**Note:** These are permissive rules for a family app. For production with sensitive data, implement proper Firebase Authentication.

## Step 5: Enable Firebase Storage

1. In the Firebase Console sidebar, click **Storage**
2. Click "Get started"
3. Click "Next" to accept the default security rules
4. Choose the same location as your Firestore database
5. Click "Done"

### Set Storage Rules

Go to the **Rules** tab and replace with:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // Allow anyone to read images
    match /{allPaths=**} {
      allow read: if true;
      // Allow uploads up to 10MB
      allow write: if request.resource.size < 10 * 1024 * 1024;
    }
  }
}
```

Click **Publish** to save the rules.

## Step 6: Add Configuration to Your Local Environment

1. Create a `.env` file in the project root (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. Fill in your Firebase configuration in `.env`:
   ```env
   GEMINI_API_KEY=your_existing_gemini_key

   # Firebase Configuration (from Step 3)
   FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=123456789012
   FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
   ```

## Step 7: Add Secrets to GitHub

For deployment via GitHub Actions, add these secrets to your repository:

1. Go to your GitHub repository
2. Click **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret** for each:
   - `FIREBASE_API_KEY`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_STORAGE_BUCKET`
   - `FIREBASE_MESSAGING_SENDER_ID`
   - `FIREBASE_APP_ID`

Use the values from your `.env` file.

## Step 8: Test Locally

1. Install dependencies (if not already done):
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:3000
4. Try creating a new post - it should save to Firebase!

## Step 9: Deploy

1. Commit and push your changes:
   ```bash
   git add .
   git commit -m "feat: Migrate to Firebase for permanent storage"
   git push
   ```

2. GitHub Actions will automatically build and deploy to GitHub Pages

## Verify Everything Works

1. Visit https://juvalandtheo.com
2. Log in with your PIN
3. Create a new post with photos
4. Refresh the page - the post should still be there!
5. Open the site on a different device/browser - you should see the same posts

## Firebase Console Links

- [Firestore Data](https://console.firebase.google.com/project/_/firestore/data): View/manage posts
- [Storage Files](https://console.firebase.google.com/project/_/storage): View/manage uploaded images
- [Usage Dashboard](https://console.firebase.google.com/project/_/usage): Monitor free tier limits

## Free Tier Limits

Firebase offers generous free tiers:

- **Firestore**: 50K reads/day, 20K writes/day, 1GB storage
- **Storage**: 1GB storage, 10GB/month downloads
- **Bandwidth**: 360MB/day

For a family photo album, you'll likely stay well within these limits!

## Troubleshooting

**"Firebase: Firebase App named '[DEFAULT]' already exists"**
- Clear your browser cache and reload

**"Missing or insufficient permissions"**
- Check your Firestore and Storage security rules (Steps 4 & 5)

**Posts not loading**
- Check browser console for errors
- Verify all environment variables are set correctly
- Check Firebase Console > Firestore for saved posts

**Images not uploading**
- Check browser console for storage errors
- Verify storage rules allow write access
- Check file sizes (must be under 10MB)
