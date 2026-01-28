import { supabase } from '@/integrations/supabase/client';

export interface OpenGraphData {
  imageUrl: string | null;
  title: string | null;
  description: string | null;
  url: string;
}

/**
 * Fetch OpenGraph metadata from a URL
 */
export async function fetchOpenGraphData(url: string): Promise<OpenGraphData | null> {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-opengraph', {
      body: { url },
    });

    if (error) {
      console.error('Error fetching OpenGraph data:', error);
      return null;
    }

    if (!data.success) {
      console.error('Failed to fetch OpenGraph data:', data.error);
      return null;
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching OpenGraph data:', error);
    return null;
  }
}

/**
 * Check if a URL is likely a regular website (not a video platform)
 */
export function isRegularWebsite(url: string): boolean {
  if (!url) return false;
  
  const videoPatterns = [
    /youtube\.com/i,
    /youtu\.be/i,
    /vimeo\.com/i,
    /dailymotion\.com/i,
    /twitch\.tv/i,
  ];
  
  return !videoPatterns.some(pattern => pattern.test(url));
}
