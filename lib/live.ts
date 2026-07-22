import liveData from '@/content/live.json';

/**
 * Live meeting config lives in content/live.json.
 * Prefer the Live Stream Assistant desktop app to edit and publish it.
 */

export type LiveConfig = {
  isLive: boolean;
  title: string;
  description: string;
  youtubeVideoId: string;
  facebookUrl: string;
  nextMeetingLabel: string;
  youtubeChannelUrl: string;
  facebookPageUrl: string;
};

export const liveConfig = liveData as LiveConfig;

export function getYouTubeEmbedUrl(videoId: string) {
  if (!videoId.trim()) return null;
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId.trim())}?autoplay=1&rel=0`;
}

export function getYouTubeWatchUrl(videoId: string) {
  if (!videoId.trim()) return liveConfig.youtubeChannelUrl;
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId.trim())}`;
}
