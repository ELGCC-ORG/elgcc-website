'use client';

import { useMemo, useState } from 'react';
import { DEFAULT_SPEAKER, Sermon, getAudioType, getBrandedListenPath, sermons } from '@/lib/teachings';

type IndexedSermon = Sermon & { originalIndex: number };

type SeriesGroup = {
  key: string;
  series: string;
  displaySeries: string;
  year: number;
  sermons: IndexedSermon[];
  count: number;
};

const seriesColorClasses = [
  'bg-[#6B7F4C]',
  'bg-[#4C737F]',
  'bg-[#7F6B4C]',
  'bg-[#664C7F]',
  'bg-[#4C7F7A]',
  'bg-[#7F4C4C]',
  'bg-[#556339]',
  'bg-[#8B7355]',
];

const LIBRARY_PAGE_SIZE = 24;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function getSeriesColor(series: string) {
  const total = Array.from(series).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return seriesColorClasses[total % seriesColorClasses.length];
}

function cleanSeriesTitle(series: string, year: number) {
  let clean = normalizeText(series)
    .replace(new RegExp(`\\s*\\(?${year}\\)?\\s*$`, 'i'), '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  clean = clean.replace(new RegExp(`\\s*\\(?${year}\\)?\\s*$`, 'i'), '').trim();
  return clean || normalizeText(series);
}

function cleanSermonTitle(sermon: Sermon) {
  const title = normalizeText(sermon.title);
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

function getTrackLabel(title: string) {
  const match = title.match(/track\s*(\d+)/i);
  return match ? `Track ${match[1]}` : '';
}

function groupSermons(items: IndexedSermon[]) {
  const groups = new Map<string, SeriesGroup>();

  for (const sermon of items) {
    const key = `${sermon.year}::${sermon.series}`;
    const existing = groups.get(key);

    if (existing) {
      existing.sermons.push(sermon);
      existing.count += 1;
      continue;
    }

    groups.set(key, {
      key,
      series: sermon.series,
      displaySeries: cleanSeriesTitle(sermon.series, sermon.year),
      year: sermon.year,
      sermons: [sermon],
      count: 1,
    });
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    if (b.count !== a.count) return b.count - a.count;
    return a.displaySeries.localeCompare(b.displaySeries);
  });
}

function getSermonUpdatedTime(sermon: IndexedSermon) {
  const timestamp = sermon.uploadedAt || sermon.date;
  if (!timestamp) return 0;

  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortLatest(items: IndexedSermon[]) {
  return [...items].sort((a, b) => {
    const aTime = getSermonUpdatedTime(a);
    const bTime = getSermonUpdatedTime(b);

    if (aTime || bTime) {
      if (bTime !== aTime) return bTime - aTime;
    }

    return b.originalIndex - a.originalIndex;
  });
}

function PlayIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function CopyIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 8h10a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8a2 2 0 012-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
    </svg>
  );
}

function DownloadIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function SectionHeader({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-primary text-xs font-bold uppercase tracking-[0.22em]">{eyebrow}</p>}
        <h2 className={`text-2xl md:text-3xl font-bold text-white ${eyebrow ? 'mt-2' : ''}`}>{title}</h2>
      </div>
    </div>
  );
}

function SeriesArtwork({ sermon }: { sermon: Sermon; compact?: boolean }) {
  const trackLabel = getTrackLabel(sermon.title);

  return (
    <div className="teaching-artwork">
      <div className={`h-1.5 w-full ${getSeriesColor(sermon.series)}`} />
      <div className="px-4 pt-4">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-white/65">
          <span>{sermon.year}</span>
          {trackLabel && (
            <>
              <span aria-hidden="true">•</span>
              <span>{trackLabel}</span>
            </>
          )}
        </div>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          {cleanSeriesTitle(sermon.series, sermon.year)}
        </p>
        <h3 className="mt-2 text-lg font-bold leading-snug text-white line-clamp-3">
          {normalizeText(sermon.title)}
        </h3>
        <p className="mt-2 text-xs text-white/55">{sermon.speaker || DEFAULT_SPEAKER}</p>
      </div>
    </div>
  );
}

function TeachingCard({
  sermon,
  onPlay,
  onCopy,
  copied,
}: {
  sermon: IndexedSermon;
  onPlay: (sermon: IndexedSermon) => void;
  onCopy: (sermon: IndexedSermon) => void;
  copied: boolean;
}) {
  return (
    <article className="teaching-card border border-white/10 bg-dark-card">
      <SeriesArtwork sermon={sermon} />
      <div className="p-4 pt-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onPlay(sermon)}
            className="inline-flex flex-1 items-center justify-center gap-2 bg-primary px-3 py-2 text-sm font-bold text-dark"
          >
            <PlayIcon className="h-4 w-4" />
            Listen
          </button>
          <a
            href={sermon.audioUrl}
            download
            className="inline-flex items-center justify-center border border-white/10 px-3 py-2 text-sm font-semibold text-white/70"
            aria-label={`Download ${cleanSermonTitle(sermon)}`}
          >
            <DownloadIcon />
          </a>
          <button
            type="button"
            onClick={() => onCopy(sermon)}
            className="inline-flex items-center justify-center border border-white/10 px-3 py-2 text-sm font-semibold text-white/70"
            aria-label={`Copy branded link for ${cleanSermonTitle(sermon)}`}
            title={copied ? 'Copied' : 'Copy link'}
          >
            {copied ? <span className="text-xs font-bold text-primary">Copied</span> : <CopyIcon />}
          </button>
        </div>
      </div>
    </article>
  );
}

function PopularSeriesCard({
  group,
  isExpanded,
  onOpen,
}: {
  group: SeriesGroup;
  isExpanded: boolean;
  onOpen: (key: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(group.key)}
      className={`rounded-xl border p-5 text-left ${
        isExpanded ? 'border-primary/50 bg-primary/10' : 'border-white/10 bg-dark-card'
      }`}
    >
      <div className={`mb-4 h-2 rounded-full ${getSeriesColor(group.series)}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-primary text-xs font-bold uppercase tracking-[0.18em]">{group.year}</p>
          <h3 className="mt-2 text-lg font-bold leading-tight text-white">{group.displaySeries}</h3>
        </div>
        <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-white/70">
          {group.count}
        </span>
      </div>
      <p className="mt-4 text-sm text-white/55">
        {group.count} {group.count === 1 ? 'message' : 'messages'} in this series
      </p>
    </button>
  );
}

function getWeekNumber(date: Date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const dayOffset = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return Math.floor((dayOffset + start.getDay()) / 7);
}

function rotateWeekly(groups: SeriesGroup[], limit: number) {
  if (groups.length <= limit) return groups;

  const week = getWeekNumber(new Date());
  const start = week % groups.length;
  const rotated = [...groups.slice(start), ...groups.slice(0, start)];
  return rotated.slice(0, limit);
}

function SermonListItem({
  sermon,
  onPlay,
  onCopy,
  copied,
}: {
  sermon: IndexedSermon;
  onPlay: (sermon: IndexedSermon) => void;
  onCopy: (sermon: IndexedSermon) => void;
  copied: boolean;
}) {
  const title = cleanSermonTitle(sermon);
  const trackLabel = getTrackLabel(sermon.title);

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3 transition-all hover:border-primary/20 hover:bg-white/[0.04] sm:px-4">
      {/* Play button */}
      <button
        type="button"
        onClick={() => onPlay(sermon)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary transition-all hover:bg-primary hover:text-dark active:scale-95"
        aria-label={`Listen to ${title}`}
      >
        <PlayIcon className="ml-0.5 h-4 w-4" />
      </button>

      {/* Sermon info */}
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-semibold leading-snug text-white/90 line-clamp-2">{title}</h4>
        <div className="mt-0.5 flex items-center gap-2">
          {trackLabel && !/^track\s*\d+$/i.test(title.trim()) && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">{trackLabel}</span>
          )}
          <span className="text-[10px] text-white/30">{sermon.speaker || DEFAULT_SPEAKER}</span>
        </div>
      </div>

      {/* Download */}
      <a
        href={sermon.audioUrl}
        download
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/5 text-white/30 transition-all hover:border-primary/30 hover:text-white/70 active:scale-95"
        aria-label={`Download ${title}`}
      >
        <DownloadIcon />
      </a>
      <button
        type="button"
        onClick={() => onCopy(sermon)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/5 text-white/30 transition-all hover:border-primary/30 hover:text-white/70 active:scale-95"
        aria-label={`Copy branded link for ${title}`}
        title={copied ? 'Copied' : 'Copy link'}
      >
        {copied ? <span className="text-[10px] font-bold text-primary">OK</span> : <CopyIcon className="h-4 w-4" />}
      </button>
    </div>
  );
}

function LibrarySeriesRow({
  group,
  expanded,
  onToggle,
  onPlay,
  onCopy,
  copiedSermonId,
}: {
  group: SeriesGroup;
  expanded: boolean;
  onToggle: (key: string) => void;
  onPlay: (sermon: IndexedSermon) => void;
  onCopy: (sermon: IndexedSermon) => void;
  copiedSermonId: string | null;
}) {
  return (
    <div className={`teaching-library-row rounded-2xl border ${
      expanded ? 'border-primary/30 bg-dark-card' : 'border-white/10 bg-dark-card'
    }`}>
      <button
        type="button"
        onClick={() => onToggle(group.key)}
        className="w-full text-left"
      >
        <div className={`h-1.5 w-full ${getSeriesColor(group.series)}`} />

        <div className="flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-5 sm:py-5">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${getSeriesColor(group.series)}`}>
            <svg className="h-5 w-5 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary sm:px-2.5 sm:py-1 sm:text-xs">
                {group.year}
              </span>
              <span className="text-[11px] font-medium text-white/40 sm:text-xs">
                {group.count} {group.count === 1 ? 'message' : 'messages'}
              </span>
            </div>
            <h3 className="mt-1.5 text-base font-bold leading-snug text-white sm:text-lg">{group.displaySeries}</h3>
          </div>

          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            expanded ? 'bg-primary/15 text-primary' : 'bg-white/5 text-white/40'
          }`}>
            <svg
              className={`h-4 w-4 ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/5 px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
          <p className="mb-4 text-xs text-white/40">
            Tap any message to listen, or use the download button to save.
          </p>
          <div className="space-y-2.5">
            {group.sermons.map((sermon) => (
              <SermonListItem
                key={sermon.id}
                sermon={sermon}
                onPlay={onPlay}
                onCopy={onCopy}
                copied={copiedSermonId === sermon.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StickyPlayer({
  sermon,
  onClose,
  onCopy,
  copied,
}: {
  sermon: IndexedSermon | null;
  onClose: () => void;
  onCopy: (sermon: IndexedSermon) => void;
  copied: boolean;
}) {
  if (!sermon) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-primary/20 bg-[#111] px-4 py-3 shadow-2xl">
      <div className="mx-auto grid max-w-7xl gap-3 md:grid-cols-[1fr_minmax(320px,520px)_auto] md:items-center">
        <div className="min-w-0">
          <p className="text-primary text-xs font-bold uppercase tracking-[0.18em]">
            Now listening
          </p>
          <h3 className="truncate text-base font-bold text-white">{cleanSermonTitle(sermon)}</h3>
          <p className="truncate text-sm text-white/50">
            {cleanSeriesTitle(sermon.series, sermon.year)} • {sermon.year}
          </p>
        </div>
        <audio key={sermon.audioUrl} controls autoPlay className="h-10 w-full">
          <source src={sermon.audioUrl} type={getAudioType(sermon.audioUrl)} />
          Your browser does not support the audio element.
        </audio>
        <div className="flex items-center gap-2">
          <a
            href={sermon.audioUrl}
            download
            className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white/70 transition-colors hover:border-primary/40 hover:text-white"
          >
            Download
          </a>
          <button
            type="button"
            onClick={() => onCopy(sermon)}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white/70 transition-colors hover:border-primary/40 hover:text-white"
          >
            {copied ? 'Copied' : 'Copy Link'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white/70 transition-colors hover:border-primary/40 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeachingsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const [activeSermon, setActiveSermon] = useState<IndexedSermon | null>(null);
  const [copiedSermonId, setCopiedSermonId] = useState<string | null>(null);
  const [libraryVisibleCount, setLibraryVisibleCount] = useState(LIBRARY_PAGE_SIZE);

  const indexedSermons = useMemo<IndexedSermon[]>(
    () => sermons.map((sermon, originalIndex) => ({ ...sermon, originalIndex })),
    []
  );

  const years = useMemo(
    () => Array.from(new Set(indexedSermons.map((sermon) => sermon.year))).sort((a, b) => b - a),
    [indexedSermons]
  );

  const filteredSermons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return indexedSermons.filter((sermon) => {
      const matchesYear = selectedYear === 'all' || sermon.year === selectedYear;
      if (!matchesYear) return false;

      if (!query) return true;

      const searchable = [
        sermon.title,
        cleanSermonTitle(sermon),
        sermon.series,
        cleanSeriesTitle(sermon.series, sermon.year),
        sermon.speaker || DEFAULT_SPEAKER,
        String(sermon.year),
      ].join(' ').toLowerCase();

      return searchable.includes(query);
    });
  }, [indexedSermons, searchQuery, selectedYear]);

  const seriesGroups = useMemo(() => groupSermons(filteredSermons), [filteredSermons]);
  const latestTeachings = useMemo(() => sortLatest(filteredSermons).slice(0, 6), [filteredSermons]);
  const popularSeries = useMemo(() => {
    const strongestSeries = [...seriesGroups]
      .sort((a, b) => b.count - a.count || b.year - a.year)
      .slice(0, 24);

    return rotateWeekly(strongestSeries, 6);
  }, [seriesGroups]);

  const visibleSeriesGroups = useMemo(
    () => seriesGroups.slice(0, libraryVisibleCount),
    [seriesGroups, libraryVisibleCount]
  );

  const toggleSeries = (key: string) => {
    setExpandedSeries((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const openSeries = (key: string) => {
    const index = seriesGroups.findIndex((group) => group.key === key);
    if (index >= libraryVisibleCount) {
      setLibraryVisibleCount(index + 1);
    }
    setExpandedSeries((current) => new Set(current).add(key));
    window.setTimeout(() => {
      document.getElementById('teaching-library')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const copyBrandedLink = async (sermon: IndexedSermon) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://eternallifegcc.com';
    const brandedLink = `${origin}${getBrandedListenPath(sermon.id)}`;

    try {
      await navigator.clipboard.writeText(brandedLink);
      setCopiedSermonId(sermon.id);
      window.setTimeout(() => setCopiedSermonId((current) => (current === sermon.id ? null : current)), 1800);
    } catch {
      window.prompt('Copy this ELGCC teaching link:', brandedLink);
    }
  };

  const handleYearChange = (year: number | 'all') => {
    setSelectedYear(year);
    setLibraryVisibleCount(LIBRARY_PAGE_SIZE);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setLibraryVisibleCount(LIBRARY_PAGE_SIZE);
  };

  return (
    <div className={`teachings-page min-h-screen bg-dark pt-20 ${activeSermon ? 'pb-36' : ''}`}>
      <header className="border-b border-primary/10 bg-dark-lighter py-16">
        <div className="container-custom">
          <div className="max-w-4xl">
            <p className="text-primary text-xs font-bold uppercase tracking-[0.24em]">Audio Library</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">
              <span className="text-white">Teachings </span>
              <span className="text-primary">and Songs</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/60">
              Explore sermons, conference teachings, worship recordings, and series from Pastor Stephen Tijesuni Oyagbile.
            </p>
          </div>
        </div>
      </header>

      <section className="border-b border-primary/10 bg-dark-lighter py-6">
        <div className="container-custom">
          <div className="grid gap-4 lg:grid-cols-[minmax(260px,420px)_1fr] lg:items-start">
            <div>
              <label className="sr-only" htmlFor="teaching-search">Search teachings</label>
              <input
                id="teaching-search"
                type="text"
                placeholder="Search by title, series, speaker, or year..."
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-dark px-4 py-3 text-white placeholder-white/40 outline-none focus:border-primary"
              />
              <p className="mt-3 text-sm text-white/55">
                {filteredSermons.length} {filteredSermons.length === 1 ? 'message' : 'messages'} • {seriesGroups.length} {seriesGroups.length === 1 ? 'series' : 'series'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <button
                type="button"
                onClick={() => handleYearChange('all')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  selectedYear === 'all'
                    ? 'bg-primary text-dark'
                    : 'border border-white/10 bg-dark text-white/60'
                }`}
              >
                All Years
              </button>
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => handleYearChange(year)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                    selectedYear === year
                      ? 'bg-primary text-dark'
                      : 'border border-white/10 bg-dark text-white/60'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="container-custom space-y-16 py-16">
        {latestTeachings.length > 0 && (
          <section>
            <SectionHeader eyebrow="Start here" title="Latest Teachings" />
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {latestTeachings.map((sermon) => (
                <TeachingCard
                  key={sermon.id}
                  sermon={sermon}
                  onPlay={setActiveSermon}
                  onCopy={copyBrandedLink}
                  copied={copiedSermonId === sermon.id}
                />
              ))}
            </div>
          </section>
        )}

        {popularSeries.length > 0 && (
          <section>
            <SectionHeader title="Popular Series" />
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {popularSeries.map((group) => (
                <PopularSeriesCard
                  key={group.key}
                  group={group}
                  isExpanded={expandedSeries.has(group.key)}
                  onOpen={openSeries}
                />
              ))}
            </div>
          </section>
        )}

        <section id="teaching-library" className="scroll-mt-28">
          <SectionHeader eyebrow="Full archive" title="Browse by Series" />
          <div className="mt-6 space-y-4">
            {visibleSeriesGroups.map((group) => (
              <LibrarySeriesRow
                key={group.key}
                group={group}
                expanded={expandedSeries.has(group.key)}
                onToggle={toggleSeries}
                onPlay={setActiveSermon}
                onCopy={copyBrandedLink}
                copiedSermonId={copiedSermonId}
              />
            ))}
          </div>
          {libraryVisibleCount < seriesGroups.length && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setLibraryVisibleCount((count) => count + LIBRARY_PAGE_SIZE)}
                className="rounded-lg border border-white/10 bg-dark-card px-5 py-3 text-sm font-semibold text-white"
              >
                Show more series ({seriesGroups.length - libraryVisibleCount} remaining)
              </button>
            </div>
          )}
        </section>

        {filteredSermons.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-dark-card p-10 text-center">
            <h2 className="text-2xl font-bold text-white">No teachings found</h2>
            <p className="mt-3 text-white/55">Try another keyword or clear the year filter.</p>
          </div>
        )}
      </main>

      <StickyPlayer
        sermon={activeSermon}
        onClose={() => setActiveSermon(null)}
        onCopy={copyBrandedLink}
        copied={Boolean(activeSermon && copiedSermonId === activeSermon.id)}
      />
    </div>
  );
}
