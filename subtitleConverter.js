const fs = require('fs');
const path = require('path');

/**
 * Converts SRT text content into valid WebVTT format
 */
function srtToVtt(srtContent) {
  // Strip UTF-8 Byte Order Mark (BOM) if present
  let cleanSrt = srtContent.replace(/^\uFEFF/, '');

  // Normalize line breaks
  cleanSrt = cleanSrt.replace(/\r\n|\r/g, '\n');

  // Convert SRT timestamp format (00:00:00,000) to WebVTT format (00:00:00.000)
  let vtt = cleanSrt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

  return `WEBVTT\n\n${vtt.trim()}\n`;
}

/**
 * Scans the media directory, converts any missing .srt files to .vtt,
 * and returns all converted files.
 */
function autoConvertSubtitles() {
  const mediaDir = path.join(__dirname, 'media');
  if (!fs.existsSync(mediaDir)) return;

  try {
    const files = fs.readdirSync(mediaDir);
    const srtFiles = files.filter(file => file.endsWith('.srt'));

    for (const srtFile of srtFiles) {
      const vttFileName = srtFile.replace(/\.srt$/i, '.vtt');
      const srtPath = path.join(mediaDir, srtFile);
      const vttPath = path.join(mediaDir, vttFileName);

      // Read with 'utf8' encoding
      let srtContent = fs.readFileSync(srtPath, 'utf8');

      // Convert if VTT doesn't exist
      if (!fs.existsSync(vttPath)) {
        console.log(`💬 Converting Subtitle: ${srtFile} -> ${vttFileName}`);
        const vttContent = srtToVtt(srtContent);
        fs.writeFileSync(vttPath, vttContent, 'utf8');
        console.log(`✅ Subtitle converted: ${vttFileName}`);
      }
    }
  } catch (err) {
    console.error('Error converting subtitles:', err);
  }
}

module.exports = { autoConvertSubtitles, srtToVtt };