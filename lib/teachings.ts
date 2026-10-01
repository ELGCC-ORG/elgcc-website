import sermonsData from '@/content/teachings/sermons.json';

export interface Sermon {
  id: string;
  title: string;
  audioUrl: string;
  series: string;
  year: number;
  date?: string;
  thumbnail?: string;
  speaker?: string;
  archiveItem?: string;
  uploadedAt?: string;
  /** Hidden from the public library when the Archive.org file is missing. */
  unavailable?: boolean;
  unavailableReason?: string;
}

export interface SermonDraft {
  title: string;
  audioUrl: string;
  series: string;
  year: number;
  speaker?: string;
  date?: string;
  thumbnail?: string;
  archiveItem?: string;
  uploadedAt?: string;
}

export const DEFAULT_SPEAKER = 'Stephen Tijesuni Oyagbile';
export const ARCHIVE_COLLECTION = 'opensource_audio';
export const ARCHIVE_CREATOR = 'Eternal Life Global Community Church';

export const allSermons = sermonsData as Sermon[];

/** Public teachings only — excludes entries whose audio is missing on Archive.org. */
export const sermons = allSermons.filter((sermon) => !sermon.unavailable);

export function normalizeTeachingText(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function slugifyTeaching(value: string) {
  const slug = normalizeTeachingText(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);

  return slug || 'sermon';
}

export function buildSermonId(draft: Pick<SermonDraft, 'year' | 'series' | 'title'>) {
  return `${draft.year}-${slugifyTeaching(draft.series)}-${slugifyTeaching(draft.title)}`;
}

export function getArchiveItemForYear(year: number) {
  return `elgcc-teachings-${year}`;
}

export function getArchiveDescription(year: number, speaker = DEFAULT_SPEAKER) {
  return `Sermon recordings from ELGCC for the year ${year}. Speaker: ${speaker}`;
}

export function getAudioType(audioUrl: string) {
  const lowerUrl = audioUrl.toLowerCase().split('?')[0];

  if (lowerUrl.endsWith('.m4a')) {
    return 'audio/mp4';
  }

  return 'audio/mpeg';
}

export function getBrandedListenPath(sermonId: string) {
  return `/listen/${encodeURIComponent(sermonId)}`;
}

export function getBrandedListenUrl(sermonId: string, origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://eternallifegcc.com') {
  return `${origin.replace(/\/$/, '')}${getBrandedListenPath(sermonId)}`;
}

export function getArchiveFileName(audioUrl: string) {
  try {
    const url = new URL(audioUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    const downloadIndex = parts.indexOf('download');

    if (downloadIndex === -1 || !parts[downloadIndex + 2]) {
      return '';
    }

    return decodeURIComponent(parts.slice(downloadIndex + 2).join('/'));
  } catch {
    return '';
  }
}

export function hasDuplicateSermon(existing: Sermon[], draft: SermonDraft) {
  const draftTitle = normalizeTeachingText(draft.title).toLowerCase();
  const draftSeries = normalizeTeachingText(draft.series).toLowerCase();
  const draftAudioUrl = normalizeTeachingText(draft.audioUrl).toLowerCase();
  const draftArchiveFile = getArchiveFileName(draft.audioUrl).toLowerCase();

  return existing.some((sermon) => {
    const sameAudioUrl = normalizeTeachingText(sermon.audioUrl).toLowerCase() === draftAudioUrl;
    const sameTeaching =
      sermon.year === draft.year &&
      normalizeTeachingText(sermon.series).toLowerCase() === draftSeries &&
      normalizeTeachingText(sermon.title).toLowerCase() === draftTitle;
    const sameArchiveFile =
      Boolean(draftArchiveFile) &&
      getArchiveFileName(sermon.audioUrl).toLowerCase() === draftArchiveFile;

    return sameAudioUrl || sameTeaching || sameArchiveFile;
  });
}

export function validateSermonDraft(draft: SermonDraft) {
  const errors: string[] = [];

  if (!normalizeTeachingText(draft.title)) {
    errors.push('Title is required.');
  }

  if (!normalizeTeachingText(draft.series)) {
    errors.push('Series is required.');
  }

  if (!Number.isInteger(draft.year) || draft.year < 1900 || draft.year > 2200) {
    errors.push('Year must be a valid four-digit year.');
  }

  try {
    const url = new URL(draft.audioUrl);
    const isArchiveAudio =
      url.hostname === 'archive.org' &&
      url.pathname.includes('/download/') &&
      /\.(mp3|m4a)$/i.test(url.pathname);

    if (!isArchiveAudio) {
      errors.push('Audio URL must be an Archive.org .mp3 or .m4a download link.');
    }
  } catch {
    errors.push('Audio URL must be a valid URL.');
  }

  return errors;
}

export type TeachingCategory =
  | 'all'
  | 'favorites'
  | 'prayer-fasting'
  | 'faith-authority'
  | 'holy-spirit'
  | 'grace-salvation'
  | 'spiritual-growth'
  | 'worship-songs';

export interface CategoryInfo {
  id: TeachingCategory;
  label: string;
  shortLabel: string;
  icon: string;
  regex?: RegExp;
}

export const TEACHING_CATEGORIES: CategoryInfo[] = [
  { id: 'all', label: 'All Teachings', shortLabel: 'All', icon: '✦' },
  { id: 'favorites', label: 'My Saved', shortLabel: 'Saved', icon: '♥' },
  {
    id: 'prayer-fasting',
    label: 'Prayer & Fasting',
    shortLabel: 'Prayer & Fasting',
    icon: '🙏',
    regex: /prayer|fasting|open doors|intercession|pray|consecrat|vigil/i,
  },
  {
    id: 'faith-authority',
    label: 'Faith & Authority',
    shortLabel: 'Faith & Authority',
    icon: '⚔️',
    regex: /faith|authority|power|victory|dominion|overcom|believers authority/i,
  },
  {
    id: 'holy-spirit',
    label: 'Holy Spirit & Gifts',
    shortLabel: 'Holy Spirit',
    icon: '🕊️',
    regex: /spirit|gifts|tongue|anoint|unction|born of the spirit/i,
  },
  {
    id: 'grace-salvation',
    label: 'Grace & Salvation',
    shortLabel: 'Grace & Salvation',
    icon: '✝️',
    regex: /grace|salvation|righteous|creation|in christ|cross|blood|redempt|justif/i,
  },
  {
    id: 'spiritual-growth',
    label: 'Spiritual Growth',
    shortLabel: 'Growth & Purpose',
    icon: '🌱',
    regex: /growth|matur|purpose|commit|service|disciple|wisdom|character/i,
  },
  {
    id: 'worship-songs',
    label: 'Worship & Songs',
    shortLabel: 'Worship & Songs',
    icon: '🎵',
    regex: /worship|song|chant|psalm|praise/i,
  },
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function cleanSeriesTitle(series: string, year?: number) {
  let clean = normalizeTeachingText(series);
  if (year) {
    clean = clean
      .replace(new RegExp(`\\s*\\(?${year}\\)?\\s*$`, 'i'), '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  return clean || normalizeTeachingText(series);
}

export function cleanSermonTitle(sermon: Pick<Sermon, 'title' | 'series' | 'year'>) {
  const title = normalizeTeachingText(sermon.title);
  const displaySeries = cleanSeriesTitle(sermon.series, sermon.year);
  const candidates = [sermon.series, displaySeries].filter(Boolean);

  for (const candidate of candidates) {
    const withoutPrefix = title
      .replace(new RegExp(`^${escapeRegExp(candidate)}\\s*[-:–—]?\\s*`, 'i'), '')
      .trim();

    if (withoutPrefix && withoutPrefix.length >= 4 && withoutPrefix !== title) {
      return withoutPrefix;
    }
  }

  return title;
}

export function getTrackLabel(title: string) {
  const match = title.match(/track\s*(\d+)/i);
  return match ? `Track ${match[1]}` : '';
}

export function matchesCategory(
  sermon: Sermon,
  category: TeachingCategory,
  savedIds: Set<string> = new Set()
): boolean {
  if (category === 'all') return true;
  if (category === 'favorites') return savedIds.has(sermon.id);

  const cat = TEACHING_CATEGORIES.find((c) => c.id === category);
  if (!cat || !cat.regex) return true;

  const target = `${sermon.title} ${sermon.series}`;
  return cat.regex.test(target);
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function generateWhatsAppShareUrl(sermon: Pick<Sermon, 'id' | 'title' | 'series' | 'speaker' | 'year'>, origin?: string) {
  const listenUrl = getBrandedListenUrl(sermon.id, origin);
  const speaker = sermon.speaker || DEFAULT_SPEAKER;
  const title = cleanSermonTitle(sermon);
  const message = `🕊️ *${title}*\nBy ${speaker}\nSeries: ${cleanSeriesTitle(sermon.series, sermon.year)}\n\nListen on ELGCC Audio Library:\n${listenUrl}`;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

