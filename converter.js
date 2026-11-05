const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;

// Point fluent-ffmpeg to static binaries
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const MEDIA_DIR = path.join(__dirname, 'media');

/**
 * Inspects a file's codecs and processes it into a web-ready FastStart MP4.
 */
function processVideo(filePath) {
  return new Promise((resolve, reject) => {
    const ext = path.extname(filePath).toLowerCase();
    
    // Only process .mkv or non-converted files
    if (ext !== '.mkv' && !filePath.endsWith('_raw.mp4')) {
      return resolve(null); 
    }

    const fileBase = path.basename(filePath, ext);
    const outputPath = path.join(MEDIA_DIR, `${fileBase}.mp4`);
    const tempOutputPath = path.join(MEDIA_DIR, `${fileBase}_temp.mp4`);

    console.log(`🔍 Inspecting: ${path.basename(filePath)}`);

    // Probe the file to check audio/video codecs
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(`Failed to probe ${filePath}: ${err.message}`);

      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      const audioCodec = audioStream ? audioStream.codec_name : null;

      // Check if audio codec needs conversion (Web browsers require AAC/MP3; AC3/DTS will fail)
      const needsAudioConversion = audioCodec && !['aac', 'mp3'].includes(audioCodec.toLowerCase());

      console.log(`🎬 Processing ${fileBase}...`);
      if (needsAudioConversion) {
        console.log(`  └─ Audio is '${audioCodec}'. Re-encoding audio to AAC (Video will fast-copy).`);
      } else {
        console.log(`  └─ Audio is '${audioCodec || 'none'}'. Performing instant remux (-c copy).`);
      }

      const command = ffmpeg(filePath)
        .outputOptions('-movflags +faststart') // Put moov atom at beginning
        .output(tempOutputPath);

      if (needsAudioConversion) {
        command.videoCodec('copy'); // Copy video stream directly
        command.audioCodec('aac');  // Convert surround sound (AC3/DTS) to AAC
      } else {
        command.outputOptions('-c copy'); // Copy both streams without re-encoding
      }

      command
        .on('progress', (progress) => {
          if (progress.percent) {
            process.stdout.write(`  └─ Progress: ${Math.round(progress.percent)}%\r`);
          }
        })
        .on('end', () => {
          console.log(`\n✅ Finished: ${fileBase}.mp4 (FastStart Enabled)`);
          
          // Replace original with converted file or delete .mkv
          try {
            if (fs.existsSync(filePath) && filePath !== outputPath) {
              fs.unlinkSync(filePath); // Delete original .mkv
            }
            fs.renameSync(tempOutputPath, outputPath); // Finalize .mp4 name
            resolve(outputPath);
          } catch (e) {
            reject(`File swap error: ${e.message}`);
          }
        })
        .on('error', (err) => {
          if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
          reject(`FFmpeg Error: ${err.message}`);
        })
        .run();
    });
  });
}

/**
 * Scans the media folder and converts any non-web-ready videos.
 */
async function autoConvertMediaFolder() {
  if (!fs.existsSync(MEDIA_DIR)) {
    fs.mkdirSync(MEDIA_DIR);
    return;
  }

  const files = fs.readdirSync(MEDIA_DIR);
  for (const file of files) {
    const fullPath = path.join(MEDIA_DIR, file);
    if (file.endsWith('.mkv')) {
      try {
        await processVideo(fullPath);
      } catch (err) {
        console.error(`❌ ${err}`);
      }
    }
  }
}

module.exports = { autoConvertMediaFolder, processVideo };

// Run directly if executed from CLI
if (require.main === module) {
  autoConvertMediaFolder();
}