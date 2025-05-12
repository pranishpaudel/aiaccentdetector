async function getYouTubeVideoInfo(youtubeUrl:string) {
  try {
    const response = await fetch(`https://api.vidfly.ai/api/media/youtube/download?url=${encodeURIComponent(youtubeUrl)}`);
    const data = await response.json();
return data.data.items[0].url
  }
    catch (error) {
        console.error('Error fetching YouTube video info:', error);
        throw new Error('Failed to fetch YouTube video info');
    }
  }

  export default getYouTubeVideoInfo;