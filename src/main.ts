import express, { Request, Response } from 'express';
import { 
  breakAudioIntoChunks, 
  processChunk, 
  calculateAverageResult, 
  cleanupTempFiles 
} from './utils/audioChunker.js';
import { taskManager } from './utils/taskManager.js';
import askQuestion from './utils/askOpenAI.js';
import generateSummary from './utils/askOpenAI.js';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import cors from 'cors';
import { mp4UrlToWav } from './utils/convertMp4ToWav.js';
import dotenv from 'dotenv';


const app = express();
app.use(cors())
dotenv.config();
app.use(express.json());

const PORT = process.env.PORT || 8001;

app.get('/api/health', (_req: Request, res: Response) => {
  res.send('I am healthy');
});

app.post('/api/video', async (req: Request, res: Response): Promise<void> => {
  try {
    let { url } = req.body;
  //   if (/youtube\.com/.test(url)) {
  // url= await getYouTubeVideoInfo(url)
  //   }
    
    // Basic validation
    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'Invalid or missing MP4 URL' });
      return;
    }

    // Create a task and return the ID immediately
    const taskId = taskManager.createTask();
    console.log(`Created task ${taskId} for URL: ${url}`);
    
    // Respond immediately with task ID
    res.status(202).json({ 
      task_id: taskId, 
      status: 'pending',
      progress: 0,
      message: 'Processing started' 
    });

    // Process the video asynchronously
    processVideo(url, taskId).catch(error => {
      console.error(`Task ${taskId} failed:`, error);
      taskManager.setTaskError(taskId, 'Internal server error');
    });
    
  } catch (error) {
    console.error('Error initiating video processing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get task status endpoint
app.get('/api/tasks/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const task = taskManager.getTask(taskId);
  
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  
  res.json(task);
});



// Function to process video asynchronously
async function processVideo(url: string, taskId: string): Promise<void> {
  const tempFiles: string[] = [];
  
  try {
    // Update task status
    taskManager.updateTaskStatus(taskId, 'processing');
    taskManager.updateTaskProgress(taskId, 5); // Initial progress
    console.log(`Processing video for task ${taskId} from URL: ${url}`);
    
    // Convert MP4 to WAV - this is about 30% of the work
    taskManager.updateTaskProgress(taskId, 10);
    console.log(`Downloading and converting video to WAV...`);
    const wavPath = await mp4UrlToWav(url);
    if (!wavPath) {
      taskManager.setTaskError(taskId, 'Failed to convert video to WAV');
      return;
    }
    
    tempFiles.push(wavPath);
    taskManager.updateTaskProgress(taskId, 30);
    
    // Break into chunks - this is about 10% of the work
    console.log(`Breaking audio into chunks...`);
    const chunkPaths = await breakAudioIntoChunks(wavPath);
    tempFiles.push(...chunkPaths);
    taskManager.updateTaskProgress(taskId, 40);
    
    // Process each chunk and collect results - this is about 50% of the work
    const chunkResults = [];
    const totalChunks = chunkPaths.length;
    
    if (totalChunks > 0) {
      console.log(`Processing ${totalChunks} audio chunks...`);
      const progressPerChunk = 50 / totalChunks; // Distribute 50% across all chunks
      
      for (let i = 0; i < chunkPaths.length; i++) {
        const chunkPath = chunkPaths[i];
        try {
          const result = await processChunk(chunkPath);
          chunkResults.push(result);
          
          // Update progress after each chunk (40% + up to 50% based on chunk progress)
          const chunkProgress = 40 + ((i + 1) * progressPerChunk);
          taskManager.updateTaskProgress(taskId, chunkProgress);
          console.log(`Processed chunk ${i + 1}/${totalChunks} (${Math.round(chunkProgress)}%)`);
        } catch (error) {
          console.error(`Skipping chunk ${chunkPath} due to error`);
          // Continue processing other chunks even if one fails
        }
      }
    }
    
    if (chunkResults.length === 0) {
      taskManager.setTaskError(taskId, 'Failed to process any audio chunks');
      return;
    }
    
    // Calculate final result - last 10% of work
    taskManager.updateTaskProgress(taskId, 90);
    console.log(`Calculating final results...`);
    const averageResult = calculateAverageResult(chunkResults);
    console.log(`Final result:`, averageResult);  
    // Generate summary with OpenAI
    console.log(`Generating summary with OpenAI...`);
    taskManager.updateTaskProgress(taskId, 95);
    const summary = await generateSummary(averageResult);
    
    console.log(`Task ${taskId} completed with result:`, averageResult);
    
    // Store result in task manager 
    taskManager.setTaskResult(taskId, {
        summary: summary,
      ...averageResult,
  
      chunk_results: chunkResults 
    });
    
  } catch (error) {
    console.error(`Error processing video for task ${taskId}:`, error);
    taskManager.setTaskError(taskId, 'Processing failed');
  } finally {
    // Clean up temporary files
    cleanupTempFiles(tempFiles);
  }
}

app.get('/api/upload-url', async (_req: Request, res: Response) => {
  try {
    const fileId = uuidv4(); 
    const fileName = `${fileId}.mp4`; 
    const bucketName = process.env.S3_BUCKET_NAME!;
    const region = process.env.AWS_REGION!;
    const key = `uploads/${fileName}`;

    const s3 = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: 'video/mp4',
    });

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 }); // 5 min

    res.status(200).json({ url: presignedUrl, downloadUrl: `https://${bucketName}.s3.${region}.amazonaws.com/${key}` });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});



setInterval(() => {
  taskManager.cleanupOldTasks();
}, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`App is running on port ${PORT}`);
});