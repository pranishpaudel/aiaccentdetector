import express, { Request, Response } from 'express';
import { mp4UrlToWav } from './utils/convertMp4ToWav.js';
import { 
  breakAudioIntoChunks, 
  processChunk, 
  calculateAverageResult, 
  cleanupTempFiles 
} from './utils/audioChunker.js';
import { taskManager } from './utils/taskManager.js';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8001;

app.get('/api/health', (_req: Request, res: Response) => {
  res.send('I am healthy');
});

app.post('/api/video', async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.body;

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
    console.log(`Processing video for task ${taskId} from URL: ${url}`);
    
    // Convert MP4 to WAV
    const wavPath = await mp4UrlToWav(url);
    if (!wavPath) {
      taskManager.setTaskError(taskId, 'Failed to convert video to WAV');
      return;
    }
    
    tempFiles.push(wavPath);
    
    // Break into chunks
    const chunkPaths = await breakAudioIntoChunks(wavPath);
    tempFiles.push(...chunkPaths);
    
    // Process each chunk and collect results
    const chunkResults = [];
    for (const chunkPath of chunkPaths) {
      try {
        const result = await processChunk(chunkPath);
        chunkResults.push(result);
      } catch (error) {
        console.error(`Skipping chunk ${chunkPath} due to error`);
        // Continue processing other chunks even if one fails
      }
    }
    
    if (chunkResults.length === 0) {
      taskManager.setTaskError(taskId, 'Failed to process any audio chunks');
      return;
    }
    
    // Calculate final result
    const averageResult = calculateAverageResult(chunkResults);
    console.log(`Task ${taskId} completed with result:`, averageResult);
    
    // Store result in task manager
    taskManager.setTaskResult(taskId, {
      ...averageResult,
      chunk_results: chunkResults // Include individual chunk results for reference
    });
    
  } catch (error) {
    console.error(`Error processing video for task ${taskId}:`, error);
    taskManager.setTaskError(taskId, 'Processing failed');
  } finally {
    // Clean up temporary files
    cleanupTempFiles(tempFiles);
  }
}

// Periodic cleanup of old tasks (run every hour)
setInterval(() => {
  taskManager.cleanupOldTasks();
}, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`App is running on port ${PORT}`);
});