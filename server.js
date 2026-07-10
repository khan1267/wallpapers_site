const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const db = require('./db'); // Import our hybrid database layer

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Path definitions
const WALLPAPERS_DIR = path.join(__dirname, 'wallpapers');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Static file serving
app.use(express.static(PUBLIC_DIR));
app.use('/wallpapers', express.static(WALLPAPERS_DIR));

// Configure Multer for File Uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(WALLPAPERS_DIR, { recursive: true });
      cb(null, WALLPAPERS_DIR);
    } catch (err) {
      cb(err, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `wallpaper-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB max limit
});

// Database helper methods are delegated to db.js

// --- API ROUTES ---

// 1. Get all wallpapers (with search, category, sort)
app.get('/api/wallpapers', async (req, res) => {
  try {
    const wallpapers = await db.getWallpapers();
    const { category, search, sortBy } = req.query;
    let filtered = [...wallpapers];

    // Filter by category
    if (category && category !== 'All') {
      filtered = filtered.filter(wp => wp.category.toLowerCase() === category.toLowerCase());
    }

    // Filter by search term (title or tags)
    if (search) {
      const query = search.toLowerCase();
      filtered = filtered.filter(wp => 
        wp.title.toLowerCase().includes(query) || 
        wp.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort wallpapers
    if (sortBy === 'downloads') {
      filtered.sort((a, b) => b.downloads - a.downloads);
    } else {
      // Default: Latest uploadDate
      filtered.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    }

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve wallpapers' });
  }
});

// 2. Upload a new wallpaper
app.post('/api/wallpapers', upload.single('wallpaperFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an image file.' });
    }

    const { title, category, tags, dimensions } = req.body;
    if (!title || !category) {
      // Clean up uploaded file if fields are missing
      await fs.unlink(req.file.path);
      return res.status(400).json({ error: 'Title and Category are required.' });
    }

    // Format tags from comma separated list
    const tagsArray = tags 
      ? tags.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean) 
      : [];

    // Calculate human-readable file size
    const bytes = req.file.size;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    let sizeStr = '0 Byte';
    if (bytes > 0) {
      const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
      sizeStr = Math.round(bytes / Math.pow(1024, i) * 10) / 10 + ' ' + sizes[i];
    }

    const newWallpaper = {
      id: 'wp_' + Date.now(),
      title: title.trim(),
      category: category.trim(),
      tags: tagsArray,
      filename: req.file.filename,
      dimensions: dimensions || 'Unknown',
      fileSize: sizeStr,
      uploadDate: new Date().toISOString(),
      downloads: 0
    };

    await db.addWallpaper(newWallpaper);

    res.status(201).json(newWallpaper);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload wallpaper' });
  }
});

// 3. Download wallpaper (Increments counter and triggers file download)
app.get('/api/wallpapers/download/:id', async (req, res) => {
  try {
    const wallpapers = await db.getWallpapers();
    const wp = wallpapers.find(w => w.id === req.params.id);

    if (!wp) {
      return res.status(404).send('Wallpaper not found');
    }

    const filePath = path.join(WALLPAPERS_DIR, wp.filename);

    try {
      await fs.access(filePath);
    } catch (e) {
      return res.status(404).send('Physical wallpaper file not found on disk');
    }

    // Increment downloads count and save DB
    await db.incrementDownloads(wp.id);

    // Prompt browser download
    res.download(filePath, `${wp.title.replace(/[^a-zA-Z0-9]/g, '_')}${path.extname(wp.filename)}`);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).send('Error downloading file');
  }
});

// Initialize database first then listen
db.initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Wallpaper server running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Database initialization failed:', err);
  app.listen(PORT, () => {
    console.log(`Wallpaper server running at http://localhost:${PORT} (fallback mode)`);
  });
});
