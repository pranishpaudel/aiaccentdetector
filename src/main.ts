
import express from 'express';
import {mp4UrlToWav} from './utils/convertMp4ToWav.js';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const form = new FormData();

const app = express();
app.use(express.json());


const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.post('/video',async (req, res) => {
  const { url } = req.body;

  // Basic validation
  if (!url || typeof url !== 'string' || !url.endsWith('.mp4')) {
    return res.status(400).json({ error: 'Invalid or missing MP4 URL' });
  }

    const wavPath = await mp4UrlToWav(url)    
    if (!wavPath) {
        return res.status(500).json({ error: 'Failed to convert video to WAV' });
    }

form.append('file', fs.createReadStream(wavPath));

const pythonAccentJson =await axios.post('http://localhost:5000/classify', form, {
  headers: {
    ...form.getHeaders(),
  }
})
const classifiedAccent = pythonAccentJson.data

  res.json(classifiedAccent);
});


app.listen(PORT,()=>{
    console.log(
        "App is running on port",
        PORT,
    )
})