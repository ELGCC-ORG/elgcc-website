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

export const sermons = sermonsData as Sermon[];

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
