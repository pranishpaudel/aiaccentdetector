import express, { Request, Response } from 'express';
import { mp4UrlToWav } from './utils/convertMp4ToWav.js';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/api/health', (_req: Request, res: Response) => {
  res.send('I am healthy');
});

app.post('/api/video', async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.body;

    // Basic validation
    if (!url || typeof url !== 'string' || !url.endsWith('.mp4')) {
      res.status(400).json({ error: 'Invalid or missing MP4 URL' });
      return;
    }

    const wavPath = await mp4UrlToWav(url);
    if (!wavPath) {
      res.status(500).json({ error: 'Failed to convert video to WAV' });
      return;
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(wavPath));

    const response = await axios.post('http://accent-classifier:5000/classify', form, {
      headers: form.getHeaders(),
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error processing video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`App is running on port ${PORT}`);
});
