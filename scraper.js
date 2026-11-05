const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 🔑 REPLACE THIS WITH YOUR OMDB API KEY
const OMDB_API_KEY = '25831cdb'; 

const MEDIA_DIR = path.join(__dirname, 'media');

/**
 * Clean messy filenames into searchable movie titles.
 * e.g., "Inception.2010.1080p.BluRay.x264.mp4" -> "Inception"
 */
function cleanFilename(filename) {
  let name = path.parse(filename).name;
  
  // Replace dots, underscores, dashes with spaces
  name = name.replace(/[\._\-]/g, ' ');

  // Remove common video release tags and 4-digit years
  name = name.replace(/\b(19|20)\d{2}\b/g, ''); // Removes years (1900-2099)
  name = name.replace(/\b(1080p|720p|4k|hdr|bluray|web-dl|webrip|x264|x265|hevc|aac)\b/gi, '');
  
  return name.trim();
}

/**
 * Downloads poster image to /media directory
 */
async function downloadPoster(url, targetPath) {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });
    
    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(targetPath);
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (err) {
    console.error(`Failed to download poster: ${err.message}`);
  }
}

/**
 * Fetches metadata from OMDb and caches poster locally.
 */
async function fetchMetadataForMovie(videoFilename) {
  const cleanTitle = cleanFilename(videoFilename);
  const baseName = path.parse(videoFilename).name;
  const jsonPath = path.join(MEDIA_DIR, `${baseName}.json`);
  const posterPath = path.join(MEDIA_DIR, `${baseName}.jpg`);

  // 1. Return cached JSON if already scraped
  if (fs.existsSync(jsonPath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      return cached;
    } catch (e) {
      console.warn(`Corrupted cache for ${baseName}, rescraping...`);
    }
  }

  // 2. Fetch from OMDb API
  try {
    console.log(`🔎 Searching OMDb for: "${cleanTitle}"...`);
    const res = await axios.get(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(cleanTitle)}`);

    if (res.data.Response === 'True') {
      const movieData = {
        title: res.data.Title,
        year: res.data.Year,
        rating: res.data.imdbRating,
        genre: res.data.Genre,
        plot: res.data.Plot,
        posterUrl: `/media/${baseName}.jpg`
      };

      // Download poster if available
      if (res.data.Poster && res.data.Poster !== 'N/A') {
        await downloadPoster(res.data.Poster, posterPath);
      }

      // Cache metadata to disk so we don't spam the API
      fs.writeFileSync(jsonPath, JSON.stringify(movieData, null, 2));
      console.log(`✨ Saved metadata & poster for "${res.data.Title}"`);
      return movieData;
    } else {
      console.warn(`⚠️ OMDb: Movie not found for "${cleanTitle}". Using fallback metadata.`);
    }
  } catch (err) {
    console.error(`❌ OMDb API error: ${err.message}`);
  }

  // Fallback if API fails or title not found
  const fallbackData = {
    title: cleanTitle || baseName,
    year: 'N/A',
    rating: 'N/A',
    genre: 'Unknown',
    plot: 'No plot description available.',
    posterUrl: fs.existsSync(posterPath) ? `/media/${baseName}.jpg` : null
  };

  fs.writeFileSync(jsonPath, JSON.stringify(fallbackData, null, 2));
  return fallbackData;
}

module.exports = { fetchMetadataForMovie };