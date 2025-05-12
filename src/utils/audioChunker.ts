import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Helper function to break audio into chunks
export async function breakAudioIntoChunks(wavPath: string, chunkDuration: number = 30): Promise<string[]> {
  const tempDir = path.dirname(wavPath);
  const baseName = path.basename(wavPath, '.wav');
  const outputPattern = path.join(tempDir, `${baseName}_chunk_%03d.wav`);
  
  console.log(`Breaking audio into ${chunkDuration}-second chunks...`);
  
  try {
    // Get audio duration using ffprobe
    const { stdout } = await execAsync(
      `ffprobe -i "${wavPath}" -show_entries format=duration -v quiet -of csv="p=0"`
    );
    
    const duration = parseFloat(stdout.trim());
    console.log(`Total audio duration: ${duration} seconds`);
    
    // Split audio into chunks
    await execAsync(
      `ffmpeg -i "${wavPath}" -f segment -segment_time ${chunkDuration} -c copy "${outputPattern}"`
    );
    
    // Get list of generated chunk files
    const chunkFiles = fs.readdirSync(tempDir)
      .filter(file => file.startsWith(`${baseName}_chunk_`) && file.endsWith('.wav'))
      .map(file => path.join(tempDir, file))
      .sort(); // Ensure chunks are processed in order
    
    console.log(`Created ${chunkFiles.length} audio chunks`);
    return chunkFiles;
  } catch (error) {
    console.error('Error breaking audio into chunks:', error);
    throw error;
  }
}

// Function to process a single chunk
export async function processChunk(chunkPath: string, apiUrl: string = 'http://accent-classifier:5000/classify'): Promise<any> {
  console.log(`Processing chunk: ${chunkPath}`);
  
  const FormData = (await import('form-data')).default;
  const axios = (await import('axios')).default;
  
  const form = new FormData();
  form.append('file', fs.createReadStream(chunkPath));
  
  try {
    const response = await axios.post(apiUrl, form, {
      headers: form.getHeaders(),
    });
    
    console.log(`Chunk result for ${path.basename(chunkPath)}:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Error processing chunk ${chunkPath}:`, error);
    throw error;
  }
}

// Calculate average result from all chunks
export function calculateAverageResult(results: any[]): any {
  if (results.length === 0) return {};
  
  // Track total score per accent and count
  const accentData: Record<string, {totalScore: number, count: number}> = {};
  
  results.forEach(result => {
    const accent = result.accent;
    const score = result.score || 0;
    
    if (!accentData[accent]) {
      accentData[accent] = { totalScore: 0, count: 0 };
    }
    
    accentData[accent].totalScore += score;
    accentData[accent].count += 1;
  });
  
  // Calculate the weighted average score for each accent
  let highestWeightedScore = -1;
  let mostConfidentAccent = '';
  const distribution: {accent: string, percentage: number, avgScore: number}[] = [];
  
  Object.entries(accentData).forEach(([accent, data]) => {
    const percentage = (data.count / results.length) * 100;
    const avgScore = data.totalScore / data.count;
    
    distribution.push({
      accent,
      percentage,
      avgScore
    });
    
    // Choose accent with highest average confidence score
    if (avgScore > highestWeightedScore) {
      highestWeightedScore = avgScore;
      mostConfidentAccent = accent;
    }
  });
  
  // Calculate overall average confidence across all results
  const totalScore = results.reduce((sum, result) => sum + (result.score || 0), 0);
  const averageConfidence = totalScore / results.length;
  
  return {
    accent: mostConfidentAccent,
    confidence: averageConfidence,
    distribution: distribution.map(({accent, percentage}) => ({accent, percentage})),
    processed_chunks: results.length
  };
}


// Clean up temporary files
export function cleanupTempFiles(files: string[]): void {
  console.log('Cleaning up temporary files...');
  files.forEach(file => {
    try {
      fs.unlinkSync(file);
      console.log(`Deleted: ${file}`);
    } catch (error) {
      console.error(`Error deleting file ${file}:`, error);
    }
  });
}