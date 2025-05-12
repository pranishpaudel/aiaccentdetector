import fs from 'fs';
import path from 'path';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

const streamPipeline = promisify(pipeline);

async function downloadVideo(url: string, outputPath: string): Promise<void> {
  const response = await axios.get(url, { responseType: 'stream' });

  if (response.status !== 200) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }

  await streamPipeline(response.data, fs.createWriteStream(outputPath));
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

/**
 * Main function: from URL to .wav file path
 */
export async function mp4UrlToWav(url: string): Promise<string> {
  const tempDir = './tmp';
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const videoPath = path.join(tempDir, `input-${uuidv4()}.mp4`);
  const audioFilename = `${uuidv4()}-${Date.now()}.wav`;
  const audioPath = path.join(tempDir, audioFilename);

  try {
    await downloadVideo(url, videoPath);
    await convertToWav(videoPath, audioPath);
  } finally {
    // Clean up input video regardless of success/failure
    fs.unlink(videoPath, (err) => {
      if (err) console.error(`Error deleting ${videoPath}:`, err);
    });
  }

  return audioPath;
}