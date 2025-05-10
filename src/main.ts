import {mp4UrlToWav} from './utils/convertMp4ToWav.js';
(async () => {
  const audioPath = await mp4UrlToWav('http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4');
  console.log('WAV audio saved at:', audioPath);
})();
