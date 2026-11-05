const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { autoConvertMediaFolder } = require('./converter');
const { autoConvertSubtitles } = require('./subtitleConverter');
const { fetchMetadataForMovie } = require('./scraper');

const app = express();
const PORT = 8000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/media', express.static(path.join(__dirname, 'media')));

// Create and serve uploads directory for local profile images
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Multer Storage Setup for Local Image Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });



const PROGRESS_FILE = path.join(__dirname, 'progress.json');
const PROFILES_FILE = path.join(__dirname, 'profiles.json');

const DEFAULT_PROFILES = [
  { id: 'alex', name: 'Alex', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Alex' },
  { id: 'sarah', name: 'Sarah', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sarah' },
  { id: 'kids', name: 'Kids', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Kids' }
];

function getProfilesData() {
  if (!fs.existsSync(PROFILES_FILE)) {
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(DEFAULT_PROFILES, null, 2), 'utf8');
    return DEFAULT_PROFILES;
  }
  try { return JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf8')); } 
  catch (e) { return DEFAULT_PROFILES; }
}

function saveProfilesData(data) {
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getProgressData() {
  if (!fs.existsSync(PROGRESS_FILE)) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({}), 'utf8');
    return {};
  }
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); } 
  catch (e) { return {}; }
}

function saveProgressData(data) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// 👤 Profiles APIs
app.get('/api/profiles', (req, res) => {
  res.json(getProfilesData());
});

// Create Profile with optional uploaded avatar file or URL
app.post('/api/profiles', upload.single('avatarFile'), (req, res) => {
  const { name, avatarUrl } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const profiles = getProfilesData();
  const id = name.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Date.now();
  
  let avatar = `/uploads/${req.file.filename}`;
  if (!req.file) {
    avatar = avatarUrl && avatarUrl.trim() !== '' 
      ? avatarUrl 
      : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;
  }

  const newProfile = { id, name, avatar };
  profiles.push(newProfile);
  saveProfilesData(profiles);

  res.json({ success: true, profile: newProfile });
});

// Update Profile API
app.put('/api/profiles/:id', upload.single('avatarFile'), (req, res) => {
  const { id } = req.params;
  const { name, avatarUrl } = req.body;

  let profiles = getProfilesData();
  const index = profiles.findIndex(p => p.id === id);

  if (index === -1) return res.status(404).json({ error: 'Profile not found' });

  if (name) profiles[index].name = name;

  if (req.file) {
    profiles[index].avatar = `/uploads/${req.file.filename}`;
  } else if (avatarUrl && avatarUrl.trim() !== '') {
    profiles[index].avatar = avatarUrl;
  }

  saveProfilesData(profiles);
  res.json({ success: true, profile: profiles[index] });
});

// Delete Profile API
app.delete('/api/profiles/:id', (req, res) => {
  const { id } = req.params;
  let profiles = getProfilesData();
  
  if (profiles.length <= 1) {
    return res.status(400).json({ error: 'Cannot delete the last remaining profile' });
  }

  profiles = profiles.filter(p => p.id !== id);
  saveProfilesData(profiles);

  res.json({ success: true });
});

// 📡 Movie Catalog API
app.get('/api/movies', async (req, res) => {
  const mediaDir = path.join(__dirname, 'media');
  const profileId = req.query.profile || 'default';

  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir);
    return res.json([]);
  }

  try {
    autoConvertSubtitles();

    const files = fs.readdirSync(mediaDir);
    const mp4Files = files.filter(file => file.endsWith('.mp4'));
    const progressData = getProgressData();

    const moviesPromises = mp4Files.map(async (file) => {
      const metadata = await fetchMetadataForMovie(file);
      const movieId = path.parse(file).name;
      
      const userKey = `${profileId}_${movieId}`;
      const savedProgress = progressData[userKey] || 0;

      const subtitles = files
        .filter(f => f.startsWith(movieId) && f.endsWith('.vtt'))
        .map(subFile => {
          let label = 'English';
          let lang = 'en';
          
          const parts = subFile.split('.');
          if (parts.length > 2 && parts[parts.length - 2].length === 2) {
            lang = parts[parts.length - 2];
            label = lang.toUpperCase();
          }

          return { label, srclang: lang, src: `/media/${subFile}` };
        });

      return {
        id: movieId,
        videoUrl: `/media/${file}`,
        subtitles,
        savedProgress,
        ...metadata
      };
    });

    const movies = await Promise.all(moviesPromises);
    res.json(movies);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

// 📡 Progress APIs
app.get('/api/progress/:profileId/:movieId', (req, res) => {
  const { profileId, movieId } = req.params;
  const userKey = `${profileId}_${movieId}`;
  const progressData = getProgressData();
  res.json({ timestamp: progressData[userKey] || 0 });
});

app.post('/api/progress', (req, res) => {
  const { profileId, movieId, timestamp, duration } = req.body;

  if (!profileId || !movieId || timestamp === undefined) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const userKey = `${profileId}_${movieId}`;
  const progressData = getProgressData();

  if (duration && (timestamp / duration) > 0.95) {
    delete progressData[userKey];
  } else {
    progressData[userKey] = Math.floor(timestamp);
  }

  saveProgressData(progressData);
  res.json({ success: true, timestamp: progressData[userKey] || 0 });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Server active: http://localhost:${PORT}`);
  try {
    await autoConvertMediaFolder();
  } catch (err) {
    console.error('Converter error:', err);
  }
});