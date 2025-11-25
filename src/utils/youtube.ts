// YouTube Live API integration utilities

export interface YouTubeChatMessage {
  id: string;
  authorDisplayName: string;
  authorChannelId: string;
  messageText: string;
  publishedAt: string;
}

export interface YouTubeChatResponse {
  nextPageToken: string | null;
  pollingIntervalMillis: number;
  messages: YouTubeChatMessage[];
}

export interface YouTubeVideoInfo {
  title: string;
  liveChatId: string | null;
  isLive: boolean;
}

/**
 * Extract video ID from various YouTube URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID&feature=share
 */
export function extractVideoId(url: string): string | null {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    
    // Handle youtu.be short URLs
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1).split('?')[0] || null;
    }
    
    // Handle youtube.com URLs
    if (urlObj.hostname.includes('youtube.com')) {
      // /watch?v=VIDEO_ID format
      const vParam = urlObj.searchParams.get('v');
      if (vParam) return vParam;
      
      // /live/VIDEO_ID format
      const liveMatch = urlObj.pathname.match(/\/live\/([^/?]+)/);
      if (liveMatch) return liveMatch[1];
      
      // /embed/VIDEO_ID format
      const embedMatch = urlObj.pathname.match(/\/embed\/([^/?]+)/);
      if (embedMatch) return embedMatch[1];
    }
    
    return null;
  } catch {
    // Try regex fallback for malformed URLs
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([^&?\s]+)/,
      /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }
}

/**
 * Fetch video info and live chat ID from YouTube Data API
 */
export async function fetchVideoInfo(videoId: string, apiKey: string): Promise<YouTubeVideoInfo> {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${videoId}&key=${apiKey}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `YouTube API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.items || data.items.length === 0) {
    throw new Error('動画が見つかりませんでした');
  }
  
  const video = data.items[0];
  const liveDetails = video.liveStreamingDetails;
  
  return {
    title: video.snippet?.title || 'Unknown',
    liveChatId: liveDetails?.activeLiveChatId || null,
    isLive: !!liveDetails?.activeLiveChatId
  };
}

/**
 * Poll live chat messages from YouTube Data API
 */
export async function pollChatMessages(
  chatId: string,
  apiKey: string,
  pageToken?: string
): Promise<YouTubeChatResponse> {
  let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${chatId}&part=snippet,authorDetails&key=${apiKey}`;
  
  if (pageToken) {
    url += `&pageToken=${pageToken}`;
  }
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    
    // Handle specific error cases
    if (response.status === 403) {
      if (error.error?.errors?.[0]?.reason === 'liveChatEnded') {
        throw new Error('ライブ配信が終了しました');
      }
      throw new Error('APIクォータを超過しました。しばらく待ってから再試行してください。');
    }
    
    throw new Error(error.error?.message || `YouTube API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  const messages: YouTubeChatMessage[] = (data.items || []).map((item: any) => ({
    id: item.id,
    authorDisplayName: item.authorDetails?.displayName || 'Unknown',
    authorChannelId: item.authorDetails?.channelId || '',
    messageText: item.snippet?.displayMessage || '',
    publishedAt: item.snippet?.publishedAt || ''
  }));
  
  return {
    nextPageToken: data.nextPageToken || null,
    pollingIntervalMillis: data.pollingIntervalMillis || 5000,
    messages
  };
}

/**
 * Check if a message contains the trigger keyword
 */
export function messageContainsKeyword(message: string, keyword: string): boolean {
  if (!message || !keyword) return false;
  
  // Normalize both strings for comparison
  const normalizedMessage = message.trim().toLowerCase();
  const normalizedKeyword = keyword.trim().toLowerCase();
  
  // Check if message starts with or equals the keyword
  return normalizedMessage === normalizedKeyword || 
         normalizedMessage.startsWith(normalizedKeyword + ' ') ||
         normalizedMessage.startsWith(normalizedKeyword + '　'); // Japanese full-width space
}

/**
 * Sanitize username for display/storage
 */
export function sanitizeUsername(name: string): string {
  if (!name) return '';
  
  // Remove potentially dangerous characters, keep Japanese/Unicode
  return name
    .trim()
    .replace(/[<>'"&\\]/g, '')
    .slice(0, 50); // Limit length
}
