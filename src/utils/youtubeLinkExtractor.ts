import axios from 'axios';

async function getYouTubeVideoInfo(youtubeUrl: string): Promise<string> {
  try {
    const response = await axios.get(
      `https://api.vidfly.ai/api/media/youtube/download?url=${encodeURIComponent(youtubeUrl)}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      }
    );

    const videoUrl = response.data?.data?.items?.[0]?.url;

    if (!videoUrl) throw new Error('Video URL not found');

    return videoUrl;
  } catch (error) {
    console.error('Error fetching YouTube video info:', error);
    throw new Error('Failed to fetch YouTube video info');
  }
}

export default getYouTubeVideoInfo;
