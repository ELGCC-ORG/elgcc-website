'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_SPEAKER,
  Sermon,
  TeachingCategory,
  TEACHING_CATEGORIES,
  cleanSeriesTitle,
  cleanSermonTitle,
  formatTime,
  generateWhatsAppShareUrl,
  getBrandedListenUrl,
  getTrackLabel,
  matchesCategory,
  sermons,
} from '@/lib/teachings';
import TeachingPlayer from '@/components/teachings/TeachingPlayer';
import SeriesModal from '@/components/teachings/SeriesModal';

type IndexedSermon = Sermon & { originalIndex: number };

type SeriesGroup = {
  key: string;
  series: string;
  displaySeries: string;
  year: number;
  sermons: IndexedSermon[];
  count: number;
};

type SortOption = 'latest' | 'oldest' | 'title-asc' | 'series-asc';
type ViewMode = 'grid' | 'list';

const seriesGradients = [
  'from-[#6B7F4C]/40 to-[#556339]/20 border-[#6B7F4C]/30 text-[#8A9D6F]',
  'from-[#8B7355]/40 to-[#6F5C44]/20 border-[#8B7355]/30 text-[#A68968]',
  'from-[#4C737F]/40 to-[#36525B]/20 border-[#4C737F]/30 text-[#6EA4B5]',
  'from-[#7F6B4C]/40 to-[#5B4C36]/20 border-[#7F6B4C]/30 text-[#B59C6E]',
  'from-[#664C7F]/40 to-[#463359]/20 border-[#664C7F]/30 text-[#A57FD0]',
  'from-[#4C7F7A]/40 to-[#335956]/20 border-[#4C7F7A]/30 text-[#71BCB4]',
];

const seriesAccentLines = [
  'bg-[#6B7F4C]',
  'bg-[#8B7355]',
  'bg-[#4C737F]',
  'bg-[#7F6B4C]',
  'bg-[#664C7F]',
  'bg-[#4C7F7A]',
];

function getSeriesGradient(series: string) {
  const total = Array.from(series).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return seriesGradients[total % seriesGradients.length];
}

function getSeriesAccentLine(series: string) {
  const total = Array.from(series).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return seriesAccentLines[total % seriesAccentLines.length];
}

const LIBRARY_PAGE_SIZE = 24;

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

function sortSermons(items: IndexedSermon[], sortOption: SortOption) {
  const list = [...items];
  switch (sortOption) {
    case 'oldest':
      return list.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.originalIndex - b.originalIndex;
      });
    case 'title-asc':
      return list.sort((a, b) => cleanSermonTitle(a).localeCompare(cleanSermonTitle(b)));
    case 'series-asc':
      return list.sort((a, b) => cleanSeriesTitle(a.series).localeCompare(cleanSeriesTitle(b.series)));
    case 'latest':
    default:
      return list.sort((a, b) => {
        const aTime = getSermonUpdatedTime(a);
        const bTime = getSermonUpdatedTime(b);
        if (aTime || bTime) {
          if (bTime !== aTime) return bTime - aTime;
        }
        return b.originalIndex - a.originalIndex;
      });
  }
}

export default function TeachingsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<TeachingCategory>('all');
  const [sortOption, setSortOption] = useState<SortOption>('latest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const [activeSermon, setActiveSermon] = useState<IndexedSermon | null>(null);
  const [playbackQueue, setPlaybackQueue] = useState<IndexedSermon[]>([]);
  const [activeQueueIndex, setActiveQueueIndex] = useState<number>(-1);

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [copiedSermonId, setCopiedSermonId] = useState<string | null>(null);
  const [libraryVisibleCount, setLibraryVisibleCount] = useState(LIBRARY_PAGE_SIZE);

  // Selected series for the Album Modal
  const [modalSeriesGroup, setModalSeriesGroup] = useState<SeriesGroup | null>(null);

  // Resume listening notification state
  const [resumePrompt, setResumePrompt] = useState<{
    id: string;
    title: string;
    series: string;
    time: number;
  } | null>(null);

  // Load saved favorites & last played from localStorage on mount
  useEffect(() => {
    try {
      const storedFavorites = localStorage.getItem('elgcc_saved_teachings');
      if (storedFavorites) {
        setSavedIds(new Set(JSON.parse(storedFavorites)));
      }

      const storedResume = localStorage.getItem('elgcc_last_played');
      if (storedResume) {
        const parsed = JSON.parse(storedResume);
        if (parsed?.id && parsed?.time > 15) {
          setResumePrompt(parsed);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const toggleSave = (sermonId: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sermonId)) {
        next.delete(sermonId);
      } else {
        next.add(sermonId);
      }
      try {
        localStorage.setItem('elgcc_saved_teachings', JSON.stringify(Array.from(next)));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const indexedSermons = useMemo<IndexedSermon[]>(
    () => sermons.map((sermon, originalIndex) => ({ ...sermon, originalIndex })),
    []
  );

  const years = useMemo(
    () => Array.from(new Set(indexedSermons.map((sermon) => sermon.year))).sort((a, b) => b - a),
    [indexedSermons]
  );

  // Filtered dataset based on search, year, and category
  const filteredSermons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return indexedSermons.filter((sermon) => {
      // Year filter
      if (selectedYear !== 'all' && sermon.year !== selectedYear) return false;

      // Category filter (including favorites)
      if (!matchesCategory(sermon, selectedCategory, savedIds)) return false;

      // Text search
      if (!query) return true;

      const searchable = [
        sermon.title,
        cleanSermonTitle(sermon),
        sermon.series,
        cleanSeriesTitle(sermon.series, sermon.year),
        sermon.speaker || DEFAULT_SPEAKER,
        String(sermon.year),
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [indexedSermons, searchQuery, selectedYear, selectedCategory, savedIds]);

  // Sorted list of filtered sermons
  const sortedSermons = useMemo(
    () => sortSermons(filteredSermons, sortOption),
    [filteredSermons, sortOption]
  );

  const seriesGroups = useMemo(() => groupSermons(sortedSermons), [sortedSermons]);

  // Spotlight / Flagship Message (e.g. 1st sermon in 2026 or latest message)
  const spotlightSermon = useMemo(() => {
    return indexedSermons.find((s) => s.year === 2026) || indexedSermons[0];
  }, [indexedSermons]);

  const spotlightSeriesGroup = useMemo(() => {
    if (!spotlightSermon) return null;
    const seriesItems = indexedSermons.filter(
      (s) => s.series === spotlightSermon.series && s.year === spotlightSermon.year
    );
    return {
      key: `${spotlightSermon.year}::${spotlightSermon.series}`,
      series: spotlightSermon.series,
      displaySeries: cleanSeriesTitle(spotlightSermon.series, spotlightSermon.year),
      year: spotlightSermon.year,
      sermons: seriesItems,
      count: seriesItems.length,
    };
  }, [spotlightSermon, indexedSermons]);

  // Featured flagship series cards
  const popularSeries = useMemo(() => {
    const strongestSeries = [...groupSermons(indexedSermons)]
      .sort((a, b) => b.count - a.count || b.year - a.year)
      .slice(0, 6);
    return strongestSeries;
  }, [indexedSermons]);

  const visibleSeriesGroups = useMemo(
    () => seriesGroups.slice(0, libraryVisibleCount),
    [seriesGroups, libraryVisibleCount]
  );

  // Playback handlers
  const handlePlaySermon = (sermon: IndexedSermon, queue: IndexedSermon[] = sortedSermons) => {
    setActiveSermon(sermon);
    setPlaybackQueue(queue);
    const idx = queue.findIndex((item) => item.id === sermon.id);
    setActiveQueueIndex(idx);
    setResumePrompt(null);
  };

  const handleNextTrack = () => {
    if (playbackQueue.length === 0 || activeQueueIndex === -1) return;
    const nextIdx = activeQueueIndex + 1;
    if (nextIdx < playbackQueue.length) {
      setActiveSermon(playbackQueue[nextIdx]);
      setActiveQueueIndex(nextIdx);
    }
  };

  const handlePrevTrack = () => {
    if (playbackQueue.length === 0 || activeQueueIndex <= 0) return;
    const prevIdx = activeQueueIndex - 1;
    setActiveSermon(playbackQueue[prevIdx]);
    setActiveQueueIndex(prevIdx);
  };

  const handlePlayEntireSeries = (seriesSermons: Sermon[]) => {
    if (seriesSermons.length === 0) return;
    const indexedSeries = seriesSermons.map((s, idx) => ({ ...s, originalIndex: idx }));
    handlePlaySermon(indexedSeries[0], indexedSeries);
    setModalSeriesGroup(null);
  };

  const copyBrandedLink = async (sermon: Sermon) => {
    const brandedLink = getBrandedListenUrl(sermon.id);
    try {
      await navigator.clipboard.writeText(brandedLink);
      setCopiedSermonId(sermon.id);
      window.setTimeout(() => setCopiedSermonId((cur) => (cur === sermon.id ? null : cur)), 2000);
    } catch {
      window.prompt('Copy this ELGCC teaching link:', brandedLink);
    }
  };

  const handleResumeClick = () => {
    if (!resumePrompt) return;
    const target = indexedSermons.find((s) => s.id === resumePrompt.id);
    if (target) {
      handlePlaySermon(target);
    }
    setResumePrompt(null);
  };

  const isFilteringActive =
    searchQuery.trim().length > 0 ||
    selectedYear !== 'all' ||
    selectedCategory !== 'all';

  return (
    <div className={`teachings-page min-h-screen bg-[#141414] text-white pt-20 ${activeSermon ? 'pb-36 sm:pb-32' : 'pb-16'}`}>
      {/* Resume Listening Prompt Banner */}
      {resumePrompt && !activeSermon && (
        <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-b border-primary/20 px-4 py-3">
          <div className="container-custom flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
              <p className="text-xs sm:text-sm text-white/90">
                Pick up where you left off: <strong className="text-primary-light font-semibold">{resumePrompt.title}</strong> at{' '}
                <span className="font-mono text-white/60">{formatTime(resumePrompt.time)}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResumeClick}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-dark shadow hover:bg-primary-light transition-all"
              >
                Resume Listening
              </button>
              <button
                type="button"
                onClick={() => setResumePrompt(null)}
                className="text-xs text-white/50 hover:text-white px-2 py-1"
                aria-label="Dismiss resume prompt"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Spotlight Header (NO live stats bar per user request) */}
      <header className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-[#1C1C1C] via-[#161616] to-[#141414] py-12 md:py-16">
        {/* Subtle Ambient Glow Orbs */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-secondary/10 blur-3xl" />

        <div className="container-custom relative z-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            {/* Title & Description */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary-light">
                <span>✦</span>
                <span>ELGCC Media</span>
              </div>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-balance">
                <span className="text-white">Teachings & </span>
                <span className="bg-gradient-to-r from-primary-light to-secondary bg-clip-text text-transparent">
                  Songs
                </span>
              </h1>
              <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-white/60">
                Immerse yourself in life-transforming sermons, conference teachings, fasting series, and spiritual insights from Pastor Stephen Tijesuni Oyagbile.
              </p>
            </div>

            {/* Featured Message Billboard Card */}
            {spotlightSermon && (
              <div className="relative rounded-3xl border border-primary/20 bg-gradient-to-br from-[#242424]/90 to-[#1A1A1A]/90 p-5 sm:p-6 shadow-2xl backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-primary/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                    Featured Teaching • {spotlightSermon.year}
                  </span>
                  <span className="text-xs text-white/40">Pastor Stephen T. Oyagbile</span>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-secondary-light">
                    {cleanSeriesTitle(spotlightSermon.series, spotlightSermon.year)}
                  </p>
                  <h3 className="mt-1 text-lg sm:text-xl font-bold text-white leading-snug line-clamp-2">
                    {cleanSermonTitle(spotlightSermon)}
                  </h3>
                </div>

                {/* Animated Waveform Decoration */}
                <div className="my-4 flex items-center gap-1 h-6 px-1 opacity-70">
                  {[40, 75, 55, 90, 65, 30, 85, 95, 45, 70, 80, 50, 60, 90, 40, 70, 55, 80, 95, 45, 60, 85].map(
                    (height, i) => (
                      <span
                        key={i}
                        className="w-1 rounded-full bg-primary/60 transition-all duration-300"
                        style={{ height: `${height}%` }}
                      />
                    )
                  )}
                </div>

                {/* Billboard Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handlePlaySermon(spotlightSermon)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-bold text-dark shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:bg-primary-light active:scale-95"
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Listen Now
                  </button>

                  {spotlightSeriesGroup && (
                    <button
                      type="button"
                      onClick={() => setModalSeriesGroup(spotlightSeriesGroup)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs sm:text-sm font-semibold text-white/80 transition-colors hover:border-primary/40 hover:text-white"
                    >
                      View Series ({spotlightSeriesGroup.count})
                    </button>
                  )}

                  <a
                    href={generateWhatsAppShareUrl(spotlightSermon)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-emerald-600/20 text-emerald-400 transition-colors hover:bg-emerald-600 hover:text-white"
                    title="Share featured teaching on WhatsApp"
                    aria-label="Share on WhatsApp"
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                    </svg>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Discovery & Filter Bar */}
      <section className="sticky top-20 z-40 border-b border-white/10 bg-[#161616]/95 backdrop-blur-md py-4">
        <div className="container-custom space-y-3">
          {/* Thematic Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {TEACHING_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const isFav = cat.id === 'favorites';
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setLibraryVisibleCount(LIBRARY_PAGE_SIZE);
                  }}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${isSelected
                    ? 'bg-primary text-dark shadow-md shadow-primary/20 scale-105'
                    : 'border border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white'
                    }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  {isFav && savedIds.size > 0 && (
                    <span className="ml-1 rounded-full bg-red-500/20 px-1.5 py-0.2 text-[10px] text-red-400 font-bold">
                      {savedIds.size}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search, Year Selector & Controls Row */}
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
            {/* Search Input with Instant Clear */}
            <div className="relative">
              <svg
                className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setLibraryVisibleCount(LIBRARY_PAGE_SIZE);
                }}
                placeholder="Search teachings, series, topic, or track..."
                className="w-full rounded-xl border border-white/10 bg-dark px-10 py-2.5 text-sm text-white placeholder-white/40 outline-none transition-colors focus:border-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40 hover:text-white"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Year Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => {
                  setSelectedYear('all');
                  setLibraryVisibleCount(LIBRARY_PAGE_SIZE);
                }}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${selectedYear === 'all'
                  ? 'bg-primary text-dark font-bold'
                  : 'border border-white/10 bg-dark text-white/60 hover:text-white'
                  }`}
              >
                All Years
              </button>
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => {
                    setSelectedYear(year);
                    setLibraryVisibleCount(LIBRARY_PAGE_SIZE);
                  }}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${selectedYear === year
                    ? 'bg-primary text-dark font-bold'
                    : 'border border-white/10 bg-dark text-white/60 hover:text-white'
                    }`}
                >
                  {year}
                </button>
              ))}
            </div>

            {/* Sort & View Mode Controls */}
            <div className="flex items-center justify-between sm:justify-end gap-2">
              {/* Sort Selector */}
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="rounded-lg border border-white/10 bg-dark px-3 py-1.5 text-xs font-medium text-white/80 outline-none focus:border-primary"
              >
                <option value="latest">Latest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title-asc">Title (A-Z)</option>
                <option value="series-asc">Series (A-Z)</option>
              </select>

              {/* View Mode Toggle: Grid vs List */}
              <div className="flex items-center rounded-lg border border-white/10 bg-dark p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${viewMode === 'grid' ? 'bg-primary text-dark' : 'text-white/40 hover:text-white'
                    }`}
                  title="Grid view"
                  aria-label="Grid view"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 4h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 10h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 16h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary text-dark' : 'text-white/40 hover:text-white'
                    }`}
                  title="List view"
                  aria-label="List view"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="container-custom space-y-14 py-10">
        {/* Results summary bar if active filtering */}
        {isFilteringActive && (
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <p className="text-sm text-white/70">
              Showing <strong className="text-white font-bold">{sortedSermons.length}</strong> matching teachings
              {selectedCategory !== 'all' && (
                <span> in <span className="text-primary font-semibold">{TEACHING_CATEGORIES.find((c) => c.id === selectedCategory)?.label}</span></span>
              )}
              {selectedYear !== 'all' && <span> ({selectedYear})</span>}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedYear('all');
                setSelectedCategory('all');
              }}
              className="text-xs text-primary hover:underline font-semibold"
            >
              Reset all filters
            </button>
          </div>
        )}

        {/* If Not Filtering: Display Popular Series Showcase */}
        {!isFilteringActive && popularSeries.length > 0 && (
          <section>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Curated Series</p>
                <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Flagship Teaching Series</h2>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {popularSeries.map((group) => {
                const gradient = getSeriesGradient(group.series);
                const accent = getSeriesAccentLine(group.series);
                return (
                  <div
                    key={group.key}
                    onClick={() => setModalSeriesGroup(group)}
                    className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-[#1E1E1E] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl"
                  >
                    <div className={`absolute top-0 inset-x-0 h-1.5 ${accent}`} />
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                          {group.year}
                        </span>
                        <h3 className="mt-2 text-lg font-bold text-white group-hover:text-primary-light transition-colors line-clamp-1">
                          {group.displaySeries}
                        </h3>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                        {group.count} {group.count === 1 ? 'part' : 'parts'}
                      </span>
                    </div>

                    <p className="mt-3 text-xs text-white/50">
                      {group.sermons[0]?.speaker || DEFAULT_SPEAKER}
                    </p>

                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/5">
                      <span className="text-xs font-semibold text-primary group-hover:underline">
                        View Tracklist →
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayEntireSeries(group.sermons);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-dark shadow transition-transform hover:scale-110 active:scale-95"
                        title="Play series from Part 1"
                        aria-label="Play series"
                      >
                        <svg className="ml-0.5 h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Primary Teachings Library Grid / List */}
        <section id="teaching-library" className="scroll-mt-36">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                {isFilteringActive ? 'Filtered Results' : 'Full Audio Library'}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                {selectedCategory === 'favorites' ? 'My Saved Messages' : 'Explore Teachings'}
              </h2>
            </div>
          </div>

          {sortedSermons.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-white/10 bg-[#1A1A1A] p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white/40">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">
                {selectedCategory === 'favorites' ? 'No Saved Teachings Yet' : 'No Teachings Found'}
              </h3>
              <p className="mt-2 text-sm text-white/50 max-w-md mx-auto">
                {selectedCategory === 'favorites'
                  ? 'Tap the heart icon on any message to save it to your personal library for quick replay.'
                  : 'Try modifying your search keywords or switching category/year filters.'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* Modern Grid View */
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedSermons.slice(0, libraryVisibleCount).map((sermon) => {
                const isPlayingThis = activeSermon?.id === sermon.id;
                const title = cleanSermonTitle(sermon);
                const displaySeries = cleanSeriesTitle(sermon.series, sermon.year);
                const trackLabel = getTrackLabel(sermon.title);
                const isSaved = savedIds.has(sermon.id);
                const whatsappUrl = generateWhatsAppShareUrl(sermon);
                const accent = getSeriesAccentLine(sermon.series);

                return (
                  <article
                    key={sermon.id}
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300 ${isPlayingThis
                      ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10 scale-[1.01]'
                      : 'border-white/10 bg-[#1E1E1E] hover:border-white/20 hover:bg-[#222222] hover:-translate-y-1 hover:shadow-xl'
                      }`}
                  >
                    {/* Series Accent Top Line */}
                    <div className={`h-1.5 w-full ${accent}`} />

                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                      {/* Top Badges */}
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-bold text-primary">
                            {sermon.year}
                          </span>
                          {trackLabel && (
                            <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/60">
                              {trackLabel}
                            </span>
                          )}
                        </div>

                        {/* Series & Title */}
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-primary-light line-clamp-1">
                          {displaySeries}
                        </p>
                        <h3 className="mt-1 text-base font-bold text-white group-hover:text-primary-light transition-colors line-clamp-2 leading-snug">
                          {title}
                        </h3>
                        <p className="mt-1.5 text-xs text-white/50">
                          {sermon.speaker || DEFAULT_SPEAKER}
                        </p>
                      </div>

                      {/* Card Action Buttons Bar */}
                      <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between gap-1.5">
                        {/* Play / Listen Button */}
                        <button
                          type="button"
                          onClick={() => handlePlaySermon(sermon)}
                          className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${isPlayingThis
                            ? 'bg-primary text-dark shadow-md'
                            : 'bg-white/5 text-white hover:bg-primary hover:text-dark'
                            }`}
                        >
                          {isPlayingThis ? (
                            <>
                              <span className="flex items-end gap-0.5 h-3">
                                <span className="w-0.5 bg-dark rounded-full animate-bounce [animation-delay:-0.3s] h-2.5" />
                                <span className="w-0.5 bg-dark rounded-full animate-bounce [animation-delay:-0.15s] h-3" />
                                <span className="w-0.5 bg-dark rounded-full animate-bounce h-2" />
                              </span>
                              <span>Playing</span>
                            </>
                          ) : (
                            <>
                              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                              <span>Listen</span>
                            </>
                          )}
                        </button>

                        {/* Save Favorite */}
                        <button
                          type="button"
                          onClick={() => toggleSave(sermon.id)}
                          className={`flex h-8 w-8 items-center justify-center rounded-xl border border-white/5 transition-colors ${isSaved ? 'text-red-400 bg-red-400/10' : 'text-white/40 hover:text-white'
                            }`}
                          title={isSaved ? 'Remove from saved' : 'Save message'}
                          aria-label="Save message"
                        >
                          <svg className="h-3.5 w-3.5" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>

                        {/* WhatsApp Share */}
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/5 text-white/40 transition-colors hover:text-emerald-400"
                          title="Share to WhatsApp"
                          aria-label="Share on WhatsApp"
                        >
                          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                          </svg>
                        </a>

                        {/* Download MP3 */}
                        <a
                          href={sermon.audioUrl}
                          download
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/5 text-white/40 transition-colors hover:text-white"
                          title="Download audio"
                          aria-label={`Download ${title}`}
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>

                        {/* Copy Link */}
                        <button
                          type="button"
                          onClick={() => copyBrandedLink(sermon)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/5 text-white/40 transition-colors hover:text-primary"
                          title={copiedSermonId === sermon.id ? 'Copied' : 'Copy link'}
                          aria-label="Copy sermon link"
                        >
                          {copiedSermonId === sermon.id ? (
                            <span className="text-[10px] font-bold text-primary">✓</span>
                          ) : (
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 8h10a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8a2 2 0 012-2z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* Streamlined List View */
            <div className="mt-6 space-y-2">
              {sortedSermons.slice(0, libraryVisibleCount).map((sermon, idx) => {
                const isPlayingThis = activeSermon?.id === sermon.id;
                const title = cleanSermonTitle(sermon);
                const displaySeries = cleanSeriesTitle(sermon.series, sermon.year);
                const isSaved = savedIds.has(sermon.id);
                const whatsappUrl = generateWhatsAppShareUrl(sermon);

                return (
                  <div
                    key={sermon.id}
                    className={`group flex items-center justify-between gap-3 rounded-xl border px-3 sm:px-4 py-3 transition-all ${isPlayingThis
                      ? 'border-primary/50 bg-primary/10'
                      : 'border-white/5 bg-[#1C1C1C] hover:border-white/20 hover:bg-[#222222]'
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handlePlaySermon(sermon)}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold transition-all ${isPlayingThis
                          ? 'bg-primary text-dark shadow'
                          : 'bg-white/5 text-white/60 group-hover:bg-primary group-hover:text-dark'
                          }`}
                        aria-label={`Play ${title}`}
                      >
                        {isPlayingThis ? (
                          <div className="flex items-end gap-0.5 h-3.5">
                            <span className="w-0.5 bg-dark rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
                            <span className="w-0.5 bg-dark rounded-full animate-bounce [animation-delay:-0.15s] h-3.5" />
                            <span className="w-0.5 bg-dark rounded-full animate-bounce h-2" />
                          </div>
                        ) : (
                          <svg className="ml-0.5 h-4 w-4 fill-current" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-primary uppercase">{sermon.year}</span>
                          <span className="text-[10px] text-white/40 uppercase tracking-wider line-clamp-1">{displaySeries}</span>
                        </div>
                        <h4 className={`text-sm font-semibold truncate ${isPlayingThis ? 'text-primary' : 'text-white'}`}>
                          {title}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSave(sermon.id)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${isSaved ? 'text-red-400' : 'text-white/30 hover:text-white'
                          }`}
                        title="Save message"
                      >
                        <svg className="h-4 w-4" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>

                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition-colors hover:text-emerald-400"
                        title="Share on WhatsApp"
                      >
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                        </svg>
                      </a>

                      <a
                        href={sermon.audioUrl}
                        download
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition-colors hover:text-white"
                        title="Download MP3"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Show More Pagination */}
          {libraryVisibleCount < sortedSermons.length && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setLibraryVisibleCount((prev) => prev + LIBRARY_PAGE_SIZE)}
                className="rounded-xl border border-white/10 bg-[#1E1E1E] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:border-primary/40 hover:bg-[#252525]"
              >
                Load more teachings ({sortedSermons.length - libraryVisibleCount} remaining)
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Series Album Modal */}
      {modalSeriesGroup && (
        <SeriesModal
          seriesTitle={modalSeriesGroup.series}
          year={modalSeriesGroup.year}
          sermons={modalSeriesGroup.sermons}
          activeSermonId={activeSermon?.id}
          savedIds={savedIds}
          isOpen={Boolean(modalSeriesGroup)}
          onClose={() => setModalSeriesGroup(null)}
          onPlaySermon={(s) => handlePlaySermon(s as IndexedSermon, modalSeriesGroup.sermons)}
          onPlayAll={handlePlayEntireSeries}
          onToggleSave={toggleSave}
        />
      )}

      {/* Custom Spotify-Grade Audio Player */}
      <TeachingPlayer
        sermon={activeSermon}
        onClose={() => setActiveSermon(null)}
        onNext={handleNextTrack}
        onPrev={handlePrevTrack}
        hasNext={activeQueueIndex !== -1 && activeQueueIndex < playbackQueue.length - 1}
        hasPrev={activeQueueIndex > 0}
        isSaved={Boolean(activeSermon && savedIds.has(activeSermon.id))}
        onToggleSave={toggleSave}
      />
    </div>
  );
}
