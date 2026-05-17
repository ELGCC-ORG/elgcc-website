'use client';

import { useMemo, useState } from 'react';
import { DEFAULT_SPEAKER, Sermon, getAudioType, sermons } from '@/lib/teachings';

type IndexedSermon = Sermon & { originalIndex: number };

type SeriesGroup = {
  key: string;
  series: string;
  displaySeries: string;
  year: number;
  sermons: IndexedSermon[];
  count: number;
};

const gradientClasses = [
  'from-[#6B7F4C] to-[#8B7355]',
  'from-[#4C737F] to-[#789CA8]',
  'from-[#7F6B4C] to-[#A89268]',
  'from-[#664C7F] to-[#9278A8]',
  'from-[#4C7F7A] to-[#78A8A2]',
  'from-[#7F4C4C] to-[#A86868]',
  'from-[#556339] to-[#7F8C5F]',
  'from-[#8B7355] to-[#D4C5A8]',
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function getSeriesGradient(series: string) {
  const total = Array.from(series).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return gradientClasses[total % gradientClasses.length];
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

function sortLatest(items: IndexedSermon[]) {
  return [...items].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return a.originalIndex - b.originalIndex;
  });
}

function PlayIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function SectionHeader({ title, eyebrow }: { title: string; eyebrow: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-primary text-xs font-bold uppercase tracking-[0.22em]">{eyebrow}</p>
        <h2 className="text-2xl md:text-3xl font-bold text-white mt-2">{title}</h2>
      </div>
    </div>
  );
}

function SeriesArtwork({ sermon, compact = false }: { sermon: Sermon; compact?: boolean }) {
  const trackLabel = getTrackLabel(sermon.title);

  return (
    <div className={`relative overflow-hidden rounded-lg bg-gradient-to-br ${getSeriesGradient(sermon.series)} ${compact ? 'h-24' : 'h-44'}`}>
      <div className="absolute inset-0 bg-black/10" />
      <div className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-xs font-bold text-white/90">
        {sermon.year}
      </div>
      {trackLabel && (
        <div className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-xs font-bold text-white/90">
          {trackLabel}
        </div>
      )}
      <div className="absolute inset-x-4 bottom-4">
        <p className="mb-2 w-fit rounded-full border border-white/20 bg-black/20 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white/80">
          {cleanSeriesTitle(sermon.series, sermon.year)}
        </p>
        <h3 className={`${compact ? 'text-base' : 'text-xl'} font-bold leading-tight text-white`}>
          {cleanSermonTitle(sermon)}
        </h3>
      </div>
    </div>
  );
}

function TeachingCard({
  sermon,
  onPlay,
}: {
  sermon: IndexedSermon;
  onPlay: (sermon: IndexedSermon) => void;
}) {
  return (
    <article className="group overflow-hidden rounded-xl border border-white/10 bg-dark-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-2xl hover:shadow-black/20">
      <SeriesArtwork sermon={sermon} />
      <div className="p-4">
        <p className="text-white/45 text-xs font-medium">{sermon.speaker || DEFAULT_SPEAKER}</p>
        <h3 className="mt-2 min-h-[3.5rem] text-lg font-bold leading-tight text-white">
          {cleanSermonTitle(sermon)}
        </h3>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onPlay(sermon)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-dark transition-colors hover:bg-primary-light"
          >
            <PlayIcon className="h-4 w-4" />
            Listen
          </button>
          <a
            href={sermon.audioUrl}
            download
            className="inline-flex items-center justify-center rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white/70 transition-colors hover:border-primary/40 hover:text-white"
            aria-label={`Download ${cleanSermonTitle(sermon)}`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
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
      className={`rounded-xl border p-5 text-left transition-all hover:-translate-y-1 hover:border-primary/40 ${
        isExpanded ? 'border-primary/50 bg-primary/10' : 'border-white/10 bg-dark-card'
      }`}
    >
      <div className={`mb-4 h-2 rounded-full bg-gradient-to-r ${getSeriesGradient(group.series)}`} />
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

function LibrarySeriesRow({
  group,
  expanded,
  onToggle,
  onPlay,
}: {
  group: SeriesGroup;
  expanded: boolean;
  onToggle: (key: string) => void;
  onPlay: (sermon: IndexedSermon) => void;
}) {
  const firstSermon = group.sermons[0];

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-dark-card">
      <button
        type="button"
        onClick={() => onToggle(group.key)}
        className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 p-4 text-left transition-colors hover:bg-white/[0.03] sm:p-5"
      >
        <div className="hidden sm:block">
          <SeriesArtwork sermon={firstSermon} compact />
        </div>
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">{group.year}</span>
            <span className="text-xs font-medium text-white/45">
              {group.count} {group.count === 1 ? 'message' : 'messages'}
            </span>
          </div>
          <h3 className="text-xl font-bold leading-tight text-white">{group.displaySeries}</h3>
          <p className="mt-2 text-sm text-white/50">Open series to listen, browse, or download messages.</p>
        </div>
        <svg
          className={`h-6 w-6 shrink-0 text-white/60 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-white/10 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group.sermons.map((sermon) => (
              <TeachingCard key={sermon.id} sermon={sermon} onPlay={onPlay} />
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
}: {
  sermon: IndexedSermon | null;
  onClose: () => void;
}) {
  if (!sermon) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-primary/20 bg-[#111]/95 px-4 py-3 shadow-2xl backdrop-blur">
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
  const popularSeries = useMemo(() => [...seriesGroups].sort((a, b) => b.count - a.count || b.year - a.year).slice(0, 6), [seriesGroups]);

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
    setExpandedSeries((current) => new Set(current).add(key));
    document.getElementById('teaching-library')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={`min-h-screen bg-dark pt-20 ${activeSermon ? 'pb-36' : ''}`}>
      <header className="border-b border-primary/10 bg-dark-lighter py-16">
        <div className="container-custom">
          <div className="max-w-4xl">
            <p className="text-primary text-xs font-bold uppercase tracking-[0.24em]">Audio Library</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">
              <span className="text-white">Teachings </span>
              <span className="gradient-text">and Songs</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/60">
              Explore sermons, conference teachings, worship recordings, and series from Pastor Stephen Tijesuni Oyagbile.
            </p>
          </div>
        </div>
      </header>

      <section className="border-b border-primary/10 bg-dark-lighter/50 py-6">
        <div className="container-custom">
          <div className="grid gap-4 lg:grid-cols-[minmax(260px,420px)_1fr] lg:items-start">
            <div>
              <label className="sr-only" htmlFor="teaching-search">Search teachings</label>
              <input
                id="teaching-search"
                type="text"
                placeholder="Search by title, series, speaker, or year..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-dark px-4 py-3 text-white placeholder-white/40 outline-none transition-colors focus:border-primary"
              />
              <p className="mt-3 text-sm text-white/55">
                {filteredSermons.length} {filteredSermons.length === 1 ? 'message' : 'messages'} • {seriesGroups.length} {seriesGroups.length === 1 ? 'series' : 'series'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <button
                type="button"
                onClick={() => setSelectedYear('all')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                  selectedYear === 'all'
                    ? 'bg-primary text-dark'
                    : 'border border-white/10 bg-dark text-white/60 hover:border-primary/30 hover:text-white'
                }`}
              >
                All Years
              </button>
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setSelectedYear(year)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                    selectedYear === year
                      ? 'bg-primary text-dark'
                      : 'border border-white/10 bg-dark text-white/60 hover:border-primary/30 hover:text-white'
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
                <TeachingCard key={sermon.id} sermon={sermon} onPlay={setActiveSermon} />
              ))}
            </div>
          </section>
        )}

        {popularSeries.length > 0 && (
          <section>
            <SectionHeader eyebrow="Deep collections" title="Popular Series" />
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
            {seriesGroups.map((group) => (
              <LibrarySeriesRow
                key={group.key}
                group={group}
                expanded={expandedSeries.has(group.key)}
                onToggle={toggleSeries}
                onPlay={setActiveSermon}
              />
            ))}
          </div>
        </section>

        {filteredSermons.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-dark-card p-10 text-center">
            <h2 className="text-2xl font-bold text-white">No teachings found</h2>
            <p className="mt-3 text-white/55">Try another keyword or clear the year filter.</p>
          </div>
        )}
      </main>

      <StickyPlayer sermon={activeSermon} onClose={() => setActiveSermon(null)} />
    </div>
  );
}
