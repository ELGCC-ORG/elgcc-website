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

export interface SeriesGroup {
  key: string;
  slug: string;
  series: string;
  displaySeries: string;
  year: number;
  speaker: string;
  coverSpeaker: string;
  isMultiSpeaker: boolean;
  categoryLabel: string;
  latestTimestamp: number;
  latestDateLabel: string;
  thumbnail?: string;
  sermons: Sermon[];
  count: number;
}

export function normalizeSpeakerKey(speaker?: string): string {
  return normalizeTeachingText(speaker || DEFAULT_SPEAKER)
    .toLowerCase()
    .replace(/^(?:pastor|pst\.?|rev\.?)\s+/i, '')
    .trim();
}

export function getSubTeachingKey(title: string): string {
  const withoutParens = title.replace(/\([^)]*\)/g, ' ');
  const withoutTrackSuffix = withoutParens.replace(
    /[-–—.,]?\s*(?:track|part|session)\s*\d+.*$/i,
    ''
  );
  const cleaned = normalizeTeachingText(withoutTrackSuffix).toLowerCase();
  return cleaned || normalizeTeachingText(title).toLowerCase();
}

export function getTrackNumber(title: string): number {
  const match = title.match(/(?:track|part|session)\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : 999;
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatShortDate(dateStr?: string, fallbackYear?: number): string {
  if (dateStr) {
    const parsed = Date.parse(dateStr);
    if (!Number.isNaN(parsed)) {
      const dt = new Date(parsed);
      return `${dt.getUTCDate()} ${SHORT_MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
    }
  }
  return fallbackYear ? String(fallbackYear) : '';
}

export function inferSeriesBadge(series: string, count: number): string {
  if (/convention/i.test(series)) return 'Convention';
  if (/crusade/i.test(series)) return 'Crusade';
  if (/conference|training of the spirit/i.test(series)) return 'Conference';
  if (/fasting/i.test(series)) return 'Fasting';
  if (/healing/i.test(series)) return 'Healing Meeting';
  if (/worship|song|chant/i.test(series)) return 'Worship';
  return count > 1 ? 'Series' : 'Message';
}

const PRESERVED_ACRONYMS = new Set(['OAU', 'ELGCC', 'IWO', 'UI', 'UCH', 'II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX', 'XI', 'XII']);
const MINOR_WORDS = new Set(['of', 'the', 'and', 'in', 'on', 'to', 'for', 'with', 'a', 'an', 'by', 'at', 'from', 'is', 'are', 'as', 'or']);

export function formatCoverHeading(raw: string): string {
  const normalized = normalizeTeachingText(raw);
  if (!normalized) return '';

  const letters = normalized.replace(/[^a-zA-Z]/g, '');
  const upperCount = normalized.replace(/[^A-Z]/g, '').length;
  const isShouting = letters.length > 0 && upperCount / letters.length > 0.7;

  if (!isShouting) return normalized;

  const words = normalized.split(' ');
  return words
    .map((word, idx) => {
      const bare = word.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (PRESERVED_ACRONYMS.has(bare)) {
        return word.toUpperCase();
      }
      const lower = word.toLowerCase();
      if (idx > 0 && idx < words.length - 1 && MINOR_WORDS.has(lower)) {
        return lower;
      }
      return lower.replace(/[a-zA-Z]/, (ch) => ch.toUpperCase());
    })
    .join(' ');
}

export function splitCoverTitle(displaySeries: string): { main: string; sub?: string } {
  const clean = normalizeTeachingText(displaySeries);
  if (!clean) return { main: 'ELGCC Teaching' };

  // Handle trailing parenthetical subtitle: "Main Title (Subtitle)"
  const parenMatch = clean.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    const left = parenMatch[1].trim();
    const inside = parenMatch[2].trim();
    if (left.length >= 3 && inside.length >= 3) {
      return {
        main: formatCoverHeading(left),
        sub: formatCoverHeading(inside),
      };
    }
  }

  // Handle dash separator: "Prefix - Main" or "Main - Subtitle"
  const dashMatch = clean.match(/^(.*?)\s+[-–—]\s+(.+)$/);
  if (dashMatch) {
    const left = dashMatch[1].trim();
    const right = dashMatch[2].trim();
    if (left.length >= 3 && right.length >= 3) {
      const leftIsEvent = /crusade|conference|convention|meeting|retreat|camp|training/i.test(left);
      if (leftIsEvent) {
        return {
          main: formatCoverHeading(right),
          sub: formatCoverHeading(left),
        };
      }
      return {
        main: formatCoverHeading(left),
        sub: formatCoverHeading(right),
      };
    }
  }

  return { main: formatCoverHeading(clean) };
}

export function getSeriesShareUrl(seriesSlug: string, origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://eternallifegcc.com') {
  return `${origin.replace(/\/$/, '')}/teachings?series=${encodeURIComponent(seriesSlug)}`;
}

export function generateSeriesWhatsAppShareUrl(
  group: Pick<SeriesGroup, 'slug' | 'displaySeries' | 'speaker' | 'count' | 'year'>,
  origin?: string
): string {
  const url = getSeriesShareUrl(group.slug, origin);
  const trackText = group.count === 1 ? '1 message' : `${group.count} tracks`;
  const message = `🕊️ *${group.displaySeries}* (${group.year})\nBy ${group.speaker} • ${trackText}\n\nListen on ELGCC Audio Library:\n${url}`;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

export function buildSeriesGroups(items: Sermon[]): SeriesGroup[] {
  const groups = new Map<string, {
    key: string;
    series: string;
    displaySeries: string;
    year: number;
    latestTimestamp: number;
    latestDateStr?: string;
    thumbnail?: string;
    indexed: Array<{ sermon: Sermon; index: number }>;
  }>();

  items.forEach((sermon, index) => {
    const key = `${sermon.year}::${sermon.series}`;
    const tsRaw = sermon.uploadedAt || sermon.date;
    const parsedTs = tsRaw ? Date.parse(tsRaw) : 0;
    const validTs = Number.isNaN(parsedTs) ? 0 : parsedTs;

    const existing = groups.get(key);
    if (existing) {
      existing.indexed.push({ sermon, index });
      if (!existing.thumbnail && sermon.thumbnail) {
        existing.thumbnail = sermon.thumbnail;
      }
      if (validTs > existing.latestTimestamp) {
        existing.latestTimestamp = validTs;
        existing.latestDateStr = tsRaw;
      }
      return;
    }

    groups.set(key, {
      key,
      series: sermon.series,
      displaySeries: cleanSeriesTitle(sermon.series, sermon.year),
      year: sermon.year,
      latestTimestamp: validTs,
      latestDateStr: tsRaw,
      thumbnail: sermon.thumbnail,
      indexed: [{ sermon, index }],
    });
  });

  const primaryHostKey = normalizeSpeakerKey(DEFAULT_SPEAKER);

  const result: SeriesGroup[] = Array.from(groups.values()).map((g) => {
    // 1. Multi-speaker detection across normalized speaker keys
    const speakerCounts = new Map<string, { display: string; count: number }>();
    g.indexed.forEach(({ sermon }) => {
      const rawSpeaker = normalizeTeachingText(sermon.speaker || DEFAULT_SPEAKER) || DEFAULT_SPEAKER;
      const normKey = normalizeSpeakerKey(rawSpeaker);
      const existing = speakerCounts.get(normKey);
      if (existing) {
        existing.count += 1;
        if (normKey === primaryHostKey && rawSpeaker === DEFAULT_SPEAKER) {
          existing.display = DEFAULT_SPEAKER;
        }
      } else {
        speakerCounts.set(normKey, {
          display: normKey === primaryHostKey ? DEFAULT_SPEAKER : rawSpeaker,
          count: 1,
        });
      }
    });

    const speakerEntries = Array.from(speakerCounts.values());
    const isMultiSpeaker = speakerEntries.length > 1;
    const singleSpeaker = speakerEntries[0]?.display || DEFAULT_SPEAKER;
    const speaker = isMultiSpeaker ? 'Multiple Ministers' : singleSpeaker;
    const coverSpeaker = isMultiSpeaker ? '' : singleSpeaker;

    // 2. Group tracks by sub-teaching so conference sub-series stay grouped and chronological
    const subBuckets = new Map<string, {
      hostRank: number;
      count: number;
      minIndex: number;
    }>();

    g.indexed.forEach(({ sermon, index }) => {
      const subKey = getSubTeachingKey(sermon.title);
      const isPrimaryHost = normalizeSpeakerKey(sermon.speaker) === primaryHostKey;
      const existing = subBuckets.get(subKey);
      if (existing) {
        existing.count += 1;
        if (isPrimaryHost) existing.hostRank = 0;
        if (index < existing.minIndex) existing.minIndex = index;
      } else {
        subBuckets.set(subKey, {
          hostRank: isPrimaryHost ? 0 : 1,
          count: 1,
          minIndex: index,
        });
      }
    });

    g.indexed.sort((a, b) => {
      const keyA = getSubTeachingKey(a.sermon.title);
      const keyB = getSubTeachingKey(b.sermon.title);
      if (keyA !== keyB && subBuckets.size > 1) {
        const metaA = subBuckets.get(keyA)!;
        const metaB = subBuckets.get(keyB)!;
        if (metaA.hostRank !== metaB.hostRank) return metaA.hostRank - metaB.hostRank;
        if (metaB.count !== metaA.count) return metaB.count - metaA.count;
        return metaA.minIndex - metaB.minIndex;
      }

      const trackA = getTrackNumber(a.sermon.title);
      const trackB = getTrackNumber(b.sermon.title);
      if (trackA !== trackB) return trackA - trackB;
      return a.index - b.index;
    });

    const sortedSermons = g.indexed.map((item) => item.sermon);

    return {
      key: g.key,
      slug: slugifyTeaching(`${g.year}-${g.series}`),
      series: g.series,
      displaySeries: g.displaySeries,
      year: g.year,
      speaker,
      coverSpeaker,
      isMultiSpeaker,
      categoryLabel: inferSeriesBadge(g.series, sortedSermons.length),
      latestTimestamp: g.latestTimestamp,
      latestDateLabel: formatShortDate(g.latestDateStr, g.year),
      thumbnail: g.thumbnail,
      sermons: sortedSermons,
      count: sortedSermons.length,
    };
  });

  return result.sort((a, b) => {
    if (b.latestTimestamp !== a.latestTimestamp) return b.latestTimestamp - a.latestTimestamp;
    if (b.year !== a.year) return b.year - a.year;
    if (b.count !== a.count) return b.count - a.count;
    return a.displaySeries.localeCompare(b.displaySeries);
  });
}

