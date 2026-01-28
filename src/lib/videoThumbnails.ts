/**
 * Utility functions to extract video thumbnails from YouTube and Vimeo URLs
 */

// YouTube URL patterns:
// - https://www.youtube.com/watch?v=VIDEO_ID
// - https://youtu.be/VIDEO_ID
// - https://www.youtube.com/embed/VIDEO_ID
// - https://www.youtube.com/v/VIDEO_ID
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// Vimeo URL patterns:
// - https://vimeo.com/VIDEO_ID
// - https://player.vimeo.com/video/VIDEO_ID
function extractVimeoId(url: string): string | null {
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Get YouTube thumbnail URL from video ID
 * Available quality options:
 * - default (120x90)
 * - mqdefault (320x180)
 * - hqdefault (480x360)
 * - sddefault (640x480)
 * - maxresdefault (1280x720) - may not exist for all videos
 */
function getYouTubeThumbnail(videoId: string, quality: 'default' | 'mqdefault' | 'hqdefault' | 'sddefault' | 'maxresdefault' = 'hqdefault'): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Get Vimeo thumbnail URL from video ID
 * Uses Vimeo's oEmbed API (returns JSON with thumbnail_url)
 * Returns the oEmbed endpoint URL for fetching
 */
function getVimeoOEmbedUrl(videoId: string): string {
  return `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`;
}

/**
 * Extract thumbnail URL from a video URL
 * Returns the thumbnail URL for YouTube or null for Vimeo (which needs an API call)
 */
export function getVideoThumbnail(url: string): { type: 'youtube' | 'vimeo' | 'unknown'; thumbnailUrl: string | null; videoId: string | null } {
  // Check YouTube
  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    return {
      type: 'youtube',
      videoId: youtubeId,
      thumbnailUrl: getYouTubeThumbnail(youtubeId, 'hqdefault'),
    };
  }
  
  // Check Vimeo
  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    return {
      type: 'vimeo',
      videoId: vimeoId,
      thumbnailUrl: null, // Will be fetched via oEmbed
    };
  }
  
  return {
    type: 'unknown',
    videoId: null,
    thumbnailUrl: null,
  };
}

/**
 * Fetch Vimeo thumbnail using oEmbed API
 */
export async function fetchVimeoThumbnail(videoId: string): Promise<string | null> {
  try {
    const response = await fetch(getVimeoOEmbedUrl(videoId));
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.thumbnail_url || null;
  } catch (error) {
    console.error('Error fetching Vimeo thumbnail:', error);
    return null;
  }
}

/**
 * Get thumbnail URL from any supported video URL
 * Returns immediately for YouTube, fetches for Vimeo
 */
export async function getVideoThumbnailUrl(url: string): Promise<string | null> {
  const result = getVideoThumbnail(url);
  
  if (result.type === 'youtube' && result.thumbnailUrl) {
    return result.thumbnailUrl;
  }
  
  if (result.type === 'vimeo' && result.videoId) {
    return await fetchVimeoThumbnail(result.videoId);
  }
  
  return null;
}

/**
 * Check if a URL is a video URL (YouTube or Vimeo)
 */
export function isVideoUrl(url: string): boolean {
  const result = getVideoThumbnail(url);
  return result.type !== 'unknown';
}
