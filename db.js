const fs = require('fs').promises;
const path = require('path');

// Local storage paths
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'database.json');

// Default seed wallpapers (used if database is empty)
const SEED_WALLPAPERS = [
  {
    "id": "wp_1",
    "title": "Neon Cyberpunk Skyline",
    "category": "Sci-Fi",
    "tags": ["cyberpunk", "neon", "city", "futuristic", "4k"],
    "filename": "cyberpunk_skyline.png",
    "dimensions": "1920x1080",
    "fileSize": "2.4 MB",
    "uploadDate": "2026-07-10T12:00:00.000Z",
    "downloads": 6
  },
  {
    "id": "wp_2",
    "title": "Retro City Lights",
    "category": "Abstract",
    "tags": ["retro", "neon", "city", "dark"],
    "filename": "neon_city.png",
    "dimensions": "1920x1080",
    "fileSize": "2.4 MB",
    "uploadDate": "2026-07-10T12:01:00.000Z",
    "downloads": 12
  },
  {
    "id": "wp_3",
    "title": "Rainy Street Reflection",
    "category": "Nature",
    "tags": ["rain", "street", "reflection", "gloomy"],
    "filename": "rainy_streets.png",
    "dimensions": "1920x1080",
    "fileSize": "2.4 MB",
    "uploadDate": "2026-07-10T12:02:00.000Z",
    "downloads": 8
  }
];

let useFirebase = false;
let firestoreDb = null;

// Firebase dependencies (dynamic imports or local check)
let firebaseApp, firestoreModule;

// Detect Firebase config
const hasFirebaseConfig = process.env.USE_FIREBASE === 'true' || (
  process.env.FIREBASE_API_KEY && 
  process.env.FIREBASE_PROJECT_ID
);

if (hasFirebaseConfig) {
  try {
    // Initialize Client Firebase SDK using named modular exports
    const { initializeApp } = require('firebase/app');
    const { 
      getFirestore, 
      collection, 
      getDocs, 
      doc, 
      setDoc, 
      updateDoc, 
      increment 
    } = require('firebase/firestore');
    
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCw4yPFdaU2wkwurtfDeOXzk3tY7sQPPjk",
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || "khan-f4ae2.firebaseapp.com",
      projectId: process.env.FIREBASE_PROJECT_ID || "khan-f4ae2",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "khan-f4ae2.firebasestorage.app",
      appId: process.env.FIREBASE_APP_ID || "1:787599284676:web:350d0d71d0ab7c39acac91"
    };

    firebaseApp = initializeApp(firebaseConfig);
    firestoreDb = getFirestore(firebaseApp);
    firestoreModule = { collection, getDocs, doc, setDoc, updateDoc, increment };
    useFirebase = true;
    console.log('🔥 Firebase Database Module Initialized successfully!');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase SDK, falling back to local file storage:', error);
    useFirebase = false;
  }
} else {
  console.log('📂 No Firebase config detected. Running in Local Storage Mode.');
}

// Helper: Read local database file
async function readLocalDb() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      const data = await fs.readFile(DB_PATH, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') {
        await fs.writeFile(DB_PATH, JSON.stringify(SEED_WALLPAPERS, null, 2));
        return SEED_WALLPAPERS;
      }
      throw err;
    }
  } catch (err) {
    console.error('Error reading local file DB:', err);
    return [];
  }
}

// Helper: Write local database file
async function writeLocalDb(data) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing local file DB:', err);
  }
}

// --- PUBLIC DATABASE API ---

// 1. Initialize Database (seeds default wallpapers on Firestore if empty)
async function initDb() {
  if (useFirebase && firestoreDb && firestoreModule) {
    try {
      const { collection, getDocs, doc, setDoc } = firestoreModule;
      const snapshot = await getDocs(collection(firestoreDb, 'wallpapers'));
      
      if (snapshot.empty) {
        console.log('🌱 Firestore database is empty. Seeding initial wallpapers...');
        for (const wp of SEED_WALLPAPERS) {
          await setDoc(doc(firestoreDb, 'wallpapers', wp.id), wp);
        }
        console.log('✅ Seeding completed successfully!');
      }
    } catch (error) {
      console.error('Error seeding Firestore database:', error);
    }
  } else {
    // local setup trigger
    await readLocalDb();
  }
}

// 2. Fetch all wallpapers
async function getWallpapers() {
  if (useFirebase && firestoreDb && firestoreModule) {
    try {
      const { collection, getDocs } = firestoreModule;
      const snapshot = await getDocs(collection(firestoreDb, 'wallpapers'));
      const wallpapers = [];
      snapshot.forEach(doc => {
        wallpapers.push(doc.data());
      });
      return wallpapers;
    } catch (error) {
      console.error('Error reading from Firestore, falling back to local storage:', error);
      return await readLocalDb();
    }
  } else {
    return await readLocalDb();
  }
}

// 3. Add a new wallpaper
async function addWallpaper(wp) {
  if (useFirebase && firestoreDb && firestoreModule) {
    try {
      const { doc, setDoc } = firestoreModule;
      await setDoc(doc(firestoreDb, 'wallpapers', wp.id), wp);
      console.log(`✅ Wallpaper "${wp.title}" added to Firestore.`);
    } catch (error) {
      console.error('Error writing to Firestore, saving locally:', error);
      const db = await readLocalDb();
      db.push(wp);
      await writeLocalDb(db);
    }
  } else {
    const db = await readLocalDb();
    db.push(wp);
    await writeLocalDb(db);
  }
}

// 4. Increment download counts
async function incrementDownloads(id) {
  if (useFirebase && firestoreDb && firestoreModule) {
    try {
      const { doc, updateDoc, increment } = firestoreModule;
      await updateDoc(doc(firestoreDb, 'wallpapers', id), {
        downloads: increment(1)
      });
      console.log(`📈 Incremented download count for wallpaper ${id} in Firestore.`);
    } catch (error) {
      console.error('Error incrementing Firestore download counter, updating locally:', error);
      await incrementLocalDownloads(id);
    }
  } else {
    await incrementLocalDownloads(id);
  }
}

// Local helper to increment downloads
async function incrementLocalDownloads(id) {
  const db = await readLocalDb();
  const index = db.findIndex(wp => wp.id === id);
  if (index !== -1) {
    db[index].downloads += 1;
    await writeLocalDb(db);
  }
}

module.exports = {
  initDb,
  getWallpapers,
  addWallpaper,
  incrementDownloads,
  isFirebaseActive: () => useFirebase
};
