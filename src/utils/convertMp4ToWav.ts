import fs from 'fs';
import path from 'path';
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';

/**
 * Downloads audio from a YouTube video URL and converts it to WAV
 * @param youtubeUrl The YouTube video URL
 * @returns Path to the generated WAV file
 */
export async function youtubeToWav(youtubeUrl: string): Promise<string> {
  const tempDir = './tmp';
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const videoPath = path.join(tempDir, `input-${uuidv4()}.mp4`);
  const audioFilename = `${uuidv4()}-${Date.now()}.wav`;
  const audioPath = path.join(tempDir, audioFilename);

  try {
    // Download video using ytdl-core
    await new Promise<void>((resolve, reject) => {
      ytdl(youtubeUrl, {
        quality: 'lowest', // Just need audio quality
        filter: 'audioonly', // Only get audio
      })
        .pipe(fs.createWriteStream(videoPath))
        .on('finish', resolve)
        .on('error', reject);
    });

    // Convert to WAV using ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .noVideo()
        .audioCodec('pcm_s16le')
        .format('wav')
        .on('end', resolve as any)
        .on('error', reject)
        .save(audioPath);
    });

    return audioPath;
  } catch (error) {
    console.error('Error in youtubeToWav:', error);
    throw error;
  } finally {
    // Clean up input video regardless of success/failure
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }
  }
}

// For non-YouTube URLs, keep your original function
export async function mp4UrlToWav(url: string): Promise<string> {
  // If it's a YouTube URL, use the YouTube-specific function
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return youtubeToWav(url);
  }
  
  // Original implementation for non-YouTube URLs
  const tempDir = './tmp';
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const videoPath = path.join(tempDir, `input-${uuidv4()}.mp4`);
  const audioFilename = `${uuidv4()}-${Date.now()}.wav`;
  const audioPath = path.join(tempDir, audioFilename);

  try {
    // Use axios for non-YouTube URLs
    const axios = await import('axios');
    const { pipeline } = await import('stream');
    const { promisify } = await import('util');
    const streamPipeline = promisify(pipeline);
    
    const response = await axios.default.get(url, { 
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (response.status !== 200) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    await streamPipeline(response.data, fs.createWriteStream(videoPath));
    
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .noVideo()
        .audioCodec('pcm_s16le')
        .format('wav')
        .on('end', resolve as any)
        .on('error', reject)
        .save(audioPath);
    });

    return audioPath;
  } finally {
    // Clean up input video regardless of success/failure
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }
  }
}