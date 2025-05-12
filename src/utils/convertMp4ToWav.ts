import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import youtubedl from 'youtube-dl-exec';

/**
 * Converts a YouTube URL to a WAV audio file
 * Handles both direct video URLs and YouTube links
 */
export async function urlToWav(url: string): Promise<string> {
  const tempDir = './tmp';
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const videoPath = path.join(tempDir, `input-${uuidv4()}.mp4`);
  const audioFilename = `${uuidv4()}-${Date.now()}.wav`;
  const audioPath = path.join(tempDir, audioFilename);

  try {
    if (isYouTubeUrl(url)) {
      await downloadYouTubeVideo(url, videoPath);
    } else {
      await downloadDirectVideo(url, videoPath);
    }
    
    await convertToWav(videoPath, audioPath);
    return audioPath;
  } finally {
    // Clean up input video regardless of success/failure
    if (fs.existsSync(videoPath)) {
      fs.unlink(videoPath, (err) => {
        if (err) console.error(`Error deleting ${videoPath}:`, err);
      });
    }
  }
}

/**
 * Checks if the URL is a YouTube URL
 */
function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

/**
 * Downloads a YouTube video using youtube-dl-exec
 */
async function downloadYouTubeVideo(url: string, outputPath: string): Promise<void> {
  try {
    await youtubedl(url, {
      output: outputPath,
      format: 'mp4',
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: ['referer:youtube.com', 'user-agent:googlebot']
    });
  } catch (error:any) {
    console.error('Failed to download YouTube video:', error);
    throw new Error(`Failed to download YouTube video: ${error.message}`);
  }
}

/**
 * Downloads a direct video URL using axios
 */
async function downloadDirectVideo(url: string, outputPath: string): Promise<void> {
  const axios = await import('axios');
  const { pipeline } = await import('stream');
  const streamPipeline = promisify(pipeline);
  
  try {
    const response = await axios.default.get(url, { responseType: 'stream' });

    if (response.status !== 200) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    await streamPipeline(response.data, fs.createWriteStream(outputPath));
  } catch (error:any) {
    console.error('Failed to download direct video:', error);
    throw new Error(`Failed to download direct video: ${error.message}`);
  }
}

/**
 * Converts a downloaded MP4 video to WAV audio
 */
function convertToWav(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec('pcm_s16le')
      .format('wav')
      .on('end', () => resolve())
      .on('error', reject)
      .save(outputPath);
  });
}

