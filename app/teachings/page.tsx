'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  sermons,
  Sermon,
  SeriesGroup,
  TEACHING_CATEGORIES,
  TeachingCategory,
  buildSeriesGroups,
  cleanSermonTitle,
  cleanSeriesTitle,
  formatShortDate,
  formatTime,
  matchesCategory,
  getBrandedListenUrl,
  getSeriesShareUrl,
  generateWhatsAppShareUrl,
  DEFAULT_SPEAKER,
} from '@/lib/teachings';
import { liveConfig } from '@/lib/live';
import SeriesArtwork from '@/components/teachings/SeriesArtwork';
import SeriesCard from '@/components/teachings/SeriesCard';
import HeroCarousel from '@/components/teachings/HeroCarousel';
import SeriesModal from '@/components/teachings/SeriesModal';
import LiveBroadcastBanner from '@/components/teachings/LiveBroadcastBanner';
import TeachingPlayer from '@/components/teachings/TeachingPlayer';

type ThemeMode = 'light' | 'dark';
type SeriesSortOption = 'latest' | 'most-tracks' | 'alpha';
type LibraryViewMode = 'series' | 'tracks';

const SERIES_PAGE_SIZE = 20;
const TRACKS_PAGE_SIZE = 24;

function TeachingsContent() {
  const searchParams = useSearchParams();
  const seriesSlugParam = searchParams.get('series');

  const [theme, setTheme] = useState<ThemeMode>('light');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<TeachingCategory>('all');
  const [sortOption, setSortOption] = useState<SeriesSortOption>('latest');
  const [viewMode, setViewMode] = useState<LibraryViewMode>('series');

  const [seriesVisibleCount, setSeriesVisibleCount] = useState(SERIES_PAGE_SIZE);
  const [tracksVisibleCount, setTracksVisibleCount] = useState(TRACKS_PAGE_SIZE);

  const [activeSermon, setActiveSermon] = useState<Sermon | null>(null);
  const [playbackQueue, setPlaybackQueue] = useState<Sermon[]>([]);
  const [activeQueueIndex, setActiveQueueIndex] = useState<number>(-1);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const [modalSeriesGroup, setModalSeriesGroup] = useState<SeriesGroup | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [resumePrompt, setResumePrompt] = useState<{
    id: string;
    title: string;
    series: string;
    time: number;
  } | null>(null);

  // Hydrate theme, saved IDs & resume prompt from localStorage
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('elgcc_teachings_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
      }

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
      // Ignore storage failures
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: ThemeMode = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('elgcc_teachings_theme', next);
      } catch {
        // Ignore storage failure
      }
      return next;
    });
  };

  // Toggle favorite on a single sermon
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
        // Ignore storage failure
      }
      return next;
    });
  };

  // Toggle saving an entire series
  const toggleSaveSeries = (group: SeriesGroup) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      const allSaved = group.sermons.every((s) => next.has(s.id));
      group.sermons.forEach((s) => {
        if (allSaved) {
          next.delete(s.id);
        } else {
          next.add(s.id);
        }
      });
      try {
        localStorage.setItem('elgcc_saved_teachings', JSON.stringify(Array.from(next)));
      } catch {
        // Ignore storage failure
      }
      return next;
    });
  };

  // All series groups sorted latest-first (tracks inside each series are chronological Part 1 -> Part N)
  const allSeriesGroups = useMemo(() => buildSeriesGroups(sermons), []);

  // Open modal automatically when deep-linked via ?series=slug
  useEffect(() => {
    if (!seriesSlugParam) return;
    const match = allSeriesGroups.find((g) => g.slug === seriesSlugParam);
    if (match) {
      setModalSeriesGroup(match);
    }
  }, [seriesSlugParam, allSeriesGroups]);

  // Distinct available years descending
  const years = useMemo(() => {
    const yearSet = new Set<number>();
    sermons.forEach((s) => yearSet.add(s.year));
    return Array.from(yearSet).sort((a, b) => b - a);
  }, []);

  // Filtered tracks
  const filteredSermons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sermons.filter((sermon) => {
      if (selectedYear !== 'all' && sermon.year !== selectedYear) return false;
      if (!matchesCategory(sermon, selectedCategory, savedIds)) return false;

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
  }, [searchQuery, selectedYear, selectedCategory, savedIds]);

  // Series groups built from filtered sermons + sort option
  const filteredSeriesGroups = useMemo(() => {
    const groups = buildSeriesGroups(filteredSermons);
    if (sortOption === 'most-tracks') {
      return [...groups].sort((a, b) => b.count - a.count || b.latestTimestamp - a.latestTimestamp);
    }
    if (sortOption === 'alpha') {
      return [...groups].sort((a, b) => a.displaySeries.localeCompare(b.displaySeries));
    }
    return groups;
  }, [filteredSermons, sortOption]);

  // Sorted flat track list for Tracks View
  const filteredTracksSorted = useMemo(() => {
    if (sortOption === 'alpha') {
      return [...filteredSermons].sort((a, b) =>
        cleanSermonTitle(a).localeCompare(cleanSermonTitle(b))
      );
    }
    // Latest uploaded/year first (keep reversed index tie-break)
    return [...filteredSermons].sort((a, b) => {
      const tA = a.uploadedAt || a.date ? Date.parse(a.uploadedAt || a.date || '') || 0 : 0;
      const tB = b.uploadedAt || b.date ? Date.parse(b.uploadedAt || b.date || '') || 0 : 0;
      if (tB !== tA) return tB - tA;
      return b.year - a.year;
    });
  }, [filteredSermons, sortOption]);

  // Playback handlers
  const handlePlaySermon = (sermon: Sermon, queue: Sermon[] = filteredTracksSorted) => {
    setActiveSermon(sermon);
    setPlaybackQueue(queue);
    const idx = queue.findIndex((item) => item.id === sermon.id);
    setActiveQueueIndex(idx);
    setResumePrompt(null);
  };

  const handlePlayEntireSeries = (seriesSermons: Sermon[]) => {
    if (seriesSermons.length === 0) return;
    handlePlaySermon(seriesSermons[0], seriesSermons);
    setModalSeriesGroup(null);
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

  const handleCopySeriesLink = async (group: SeriesGroup) => {
    const url = getSeriesShareUrl(
      group.slug,
      typeof window !== 'undefined' ? window.location.origin : undefined
    );
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(group.key);
      window.setTimeout(() => setCopiedKey((cur) => (cur === group.key ? null : cur)), 2000);
    } catch {
      window.prompt('Copy series link:', url);
    }
  };

  const handleCopyTrackLink = async (sermon: Sermon) => {
    const url = getBrandedListenUrl(
      sermon.id,
      typeof window !== 'undefined' ? window.location.origin : undefined
    );
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(sermon.id);
      window.setTimeout(() => setCopiedKey((cur) => (cur === sermon.id ? null : cur)), 2000);
    } catch {
      window.prompt('Copy listen link:', url);
    }
  };

  const handleResumeClick = () => {
    if (!resumePrompt) return;
    const target = sermons.find((s) => s.id === resumePrompt.id);
    if (target) {
      handlePlaySermon(target);
    }
    setResumePrompt(null);
  };

  const scrollToLibrary = () => {
    const el = document.getElementById('all-teachings');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedYear('all');
    setSelectedCategory('all');
    setSeriesVisibleCount(SERIES_PAGE_SIZE);
    setTracksVisibleCount(TRACKS_PAGE_SIZE);
  };

  const isFilteringActive =
    searchQuery.trim().length > 0 ||
    selectedYear !== 'all' ||
    selectedCategory !== 'all';

  const isLight = theme === 'light';
  const activeSeriesKey = activeSermon ? `${activeSermon.year}::${activeSermon.series}` : null;

  const heroGroups = allSeriesGroups.slice(0, 6);
  const latestTenGroups = allSeriesGroups.slice(0, 10);

  return (
    <div
      className={`teachings-page min-h-screen pt-20 transition-colors duration-300 ${
        isLight ? 'bg-[#FAFAFA] text-[#111111]' : 'bg-[#121212] text-white'
      } ${activeSermon ? 'pb-36 sm:pb-32' : 'pb-20'}`}
    >
      {/* Slim Sticky Utility Sub-Bar (Search, Saved, Theme Toggle) */}
      <div
        className={`sticky top-20 z-30 border-b backdrop-blur-md transition-colors duration-300 ${
          isLight
            ? 'border-black/[0.08] bg-[#FAFAFA]/90'
            : 'border-white/10 bg-[#121212]/90'
        }`}
      >
        <div className="container-custom flex items-center justify-between gap-2.5 py-2.5 sm:py-3">
          {/* Pill Search Input */}
          <div className="relative flex-1 max-w-md">
            <svg
              className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${
                isLight ? 'text-[#777777]' : 'text-white/40'
              }`}
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
                setSeriesVisibleCount(SERIES_PAGE_SIZE);
                setTracksVisibleCount(TRACKS_PAGE_SIZE);
              }}
              placeholder="Search teachings, series, topics..."
              aria-label="Search teachings"
              className={`w-full rounded-full border py-2 pl-10 pr-8 text-xs sm:text-sm outline-none transition-colors ${
                isLight
                  ? 'border-black/10 bg-white text-[#111111] placeholder-[#888888] focus:border-primary'
                  : 'border-white/10 bg-[#1D1D1D] text-white placeholder-white/40 focus:border-primary'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold ${
                  isLight ? 'text-[#777777] hover:text-[#111111]' : 'text-white/45 hover:text-white'
                }`}
              >
                ✕
              </button>
            )}
          </div>

          {/* Right Controls: Saved + Light/Dark Theme Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (selectedCategory === 'favorites') {
                  setSelectedCategory('all');
                  setViewMode('series');
                } else {
                  setSelectedCategory('favorites');
                  setViewMode('tracks');
                }
              }}
              title="My Saved Teachings"
              aria-label="Toggle saved teachings"
              className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-all ${
                selectedCategory === 'favorites'
                  ? 'border-primary bg-primary text-white shadow-sm'
                  : isLight
                    ? 'border-black/10 bg-white text-[#333333] hover:border-black/25'
                    : 'border-white/10 bg-[#1D1D1D] text-white/80 hover:border-white/25'
              }`}
            >
              <svg
                className="h-3.5 w-3.5"
                fill={selectedCategory === 'favorites' || savedIds.size > 0 ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="hidden sm:inline">Saved</span>
              {savedIds.size > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                    selectedCategory === 'favorites'
                      ? 'bg-white/25 text-white'
                      : isLight
                        ? 'bg-black/[0.06] text-[#222222]'
                        : 'bg-white/15 text-white'
                  }`}
                >
                  {savedIds.size}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              title={isLight ? 'Switch to Dark mode' : 'Switch to Light mode'}
              aria-label={isLight ? 'Switch to Dark mode' : 'Switch to Light mode'}
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                isLight
                  ? 'border-black/10 bg-white text-[#333333] hover:border-black/25 hover:text-[#111111]'
                  : 'border-white/10 bg-[#1D1D1D] text-amber-300 hover:border-white/25 hover:text-amber-200'
              }`}
            >
              {isLight ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Slim Resume Listening Prompt Strip */}
      {resumePrompt && !activeSermon && (
        <div
          className={`border-b px-4 py-2.5 ${
            isLight
              ? 'border-primary/20 bg-primary/[0.08] text-[#1A1A1A]'
              : 'border-primary/20 bg-primary/15 text-white'
          }`}
        >
          <div className="container-custom flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse" />
              <p className="text-xs sm:text-sm truncate">
                Continue listening: <strong className="font-bold text-primary">{resumePrompt.title}</strong>{' '}
                <span className={isLight ? 'text-[#666666]' : 'text-white/60'}>
                  ({formatTime(resumePrompt.time)})
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResumeClick}
                className="rounded-[4px] bg-primary px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-primary-dark"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={() => setResumePrompt(null)}
                aria-label="Dismiss resume strip"
                className={`px-1.5 py-1 text-xs ${
                  isLight ? 'text-[#666666] hover:text-[#111111]' : 'text-white/50 hover:text-white'
                }`}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <div className="container-custom space-y-14 sm:space-y-16 pt-8 sm:pt-12">
        {/* Editorial Hero + Featured Carousel (Shown when not actively filtering) */}
        {!isFilteringActive && (
          <header className="grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr] gap-8 lg:gap-12 items-center">
            {/* Left Copy & CTAs */}
            <div>
              <p
                className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] ${
                  isLight ? 'text-[#777777]' : 'text-white/50'
                }`}
              >
                ETERNAL LIFE GLOBAL COMMUNITY CHURCH · MEDIA
              </p>

              <h1 className="mt-3 text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight leading-[1.06] text-balance">
                The Word of God,{' '}
                <span className="text-primary">on the go.</span>
              </h1>

              <p
                className={`mt-4 max-w-lg text-sm sm:text-base leading-relaxed ${
                  isLight ? 'text-[#555555]' : 'text-white/65'
                }`}
              >
                Every message recorded and released from our meetings, conferences, crusades, and fasting series by Pastor Stephen Tijesuni Oyagbile. Stream online or download free.
              </p>

              <div className="mt-6 grid grid-cols-2 sm:flex sm:items-center gap-3">
                <button
                  type="button"
                  onClick={scrollToLibrary}
                  className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-primary px-4 sm:px-6 py-3.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-primary-dark active:scale-[0.99]"
                >
                  <span>EXPLORE TEACHINGS</span>
                  <span aria-hidden="true">→</span>
                </button>

                <Link
                  href="/live"
                  className={`inline-flex items-center justify-center gap-2 rounded-[4px] border px-4 sm:px-6 py-3.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-colors ${
                    isLight
                      ? 'border-black/15 bg-white text-[#1A1A1A] hover:border-black/35'
                      : 'border-white/15 bg-white/5 text-white hover:border-white/35'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      liveConfig.isLive ? 'bg-red-500 animate-ping' : 'bg-primary'
                    }`}
                  />
                  <span>LISTEN LIVE</span>
                </Link>
              </div>
            </div>

            {/* Right / Stacked Mobile Carousel */}
            <div>
              <HeroCarousel
                groups={heroGroups}
                theme={theme}
                activeSeriesKey={activeSeriesKey}
                onOpenSeries={setModalSeriesGroup}
                onPlaySeries={(group) => handlePlayEntireSeries(group.sermons)}
              />
            </div>
          </header>
        )}

        {/* Latest. Section (10 Square Covers Grid, 5-Col Desktop / 2-Col Mobile) */}
        {!isFilteringActive && latestTenGroups.length > 0 && (
          <section aria-label="Latest Teachings and Series">
            <div className="flex items-end justify-between gap-4 mb-5 sm:mb-6">
              <div>
                <p
                  className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                    isLight ? 'text-[#777777]' : 'text-white/45'
                  }`}
                >
                  MESSAGES &amp; SERIES
                </p>
                <h2 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight">
                  Latest.
                </h2>
              </div>

              <button
                type="button"
                onClick={scrollToLibrary}
                className={`inline-flex items-center gap-1.5 rounded-[4px] border px-3.5 sm:px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  isLight
                    ? 'border-black/15 bg-white text-[#1A1A1A] hover:border-black/35'
                    : 'border-white/15 bg-white/5 text-white hover:border-white/35'
                }`}
              >
                <span>VIEW ALL</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-5">
              {latestTenGroups.map((group) => (
                <SeriesCard
                  key={group.key}
                  group={group}
                  theme={theme}
                  isPlayingSeries={activeSeriesKey === group.key}
                  isSavedSeries={group.sermons.every((s) => savedIds.has(s.id))}
                  copiedKey={copiedKey}
                  onOpenSeries={setModalSeriesGroup}
                  onPlaySeries={(g) => handlePlayEntireSeries(g.sermons)}
                  onToggleSaveSeries={toggleSaveSeries}
                  onCopySeriesLink={handleCopySeriesLink}
                />
              ))}
            </div>
          </section>
        )}

        {/* Live Broadcast Banner (Matching "On air, 24 / 7." section) */}
        {!isFilteringActive && <LiveBroadcastBanner theme={theme} />}

        {/* Full Archive, Categories, Years & Search Results Section */}
        <section id="all-teachings" className="scroll-mt-36 space-y-6">
          {/* Header Row */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p
                className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                  isLight ? 'text-[#777777]' : 'text-white/45'
                }`}
              >
                {selectedCategory === 'favorites'
                  ? 'PERSONAL LIBRARY'
                  : isFilteringActive
                    ? 'SEARCH & FILTER RESULTS'
                    : 'FULL AUDIO LIBRARY'}
              </p>
              <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight">
                {selectedCategory === 'favorites'
                  ? 'My Saved.'
                  : isFilteringActive
                    ? 'Matching Teachings.'
                    : 'Explore All Series.'}
              </h2>
            </div>

            {isFilteringActive && (
              <div className="flex items-center gap-3">
                <span className={`text-xs ${isLight ? 'text-[#666666]' : 'text-white/55'}`}>
                  {filteredSeriesGroups.length} series · {filteredSermons.length} tracks
                </span>
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>

          {/* Filter Strip: Category Pills + Year Pills + Sort & View Switch */}
          <div className="space-y-3">
            {/* Thematic Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {TEACHING_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      if (cat.id === 'favorites') {
                        setViewMode('tracks');
                      }
                      setSeriesVisibleCount(SERIES_PAGE_SIZE);
                      setTracksVisibleCount(TRACKS_PAGE_SIZE);
                    }}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-primary bg-primary text-white shadow-sm'
                        : isLight
                          ? 'border-black/10 bg-white text-[#444444] hover:border-black/25 hover:text-[#111111]'
                          : 'border-white/10 bg-[#1B1B1B] text-white/70 hover:border-white/25 hover:text-white'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                    {cat.id === 'favorites' && savedIds.size > 0 && (
                      <span
                        className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                          isSelected
                            ? 'bg-white/25 text-white'
                            : isLight
                              ? 'bg-black/[0.06] text-[#222222]'
                              : 'bg-white/15 text-white'
                        }`}
                      >
                        {savedIds.size}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Years + Sort + View Mode Row */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Year Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedYear('all');
                    setSeriesVisibleCount(SERIES_PAGE_SIZE);
                    setTracksVisibleCount(TRACKS_PAGE_SIZE);
                  }}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    selectedYear === 'all'
                      ? isLight
                        ? 'border-[#111111] bg-[#111111] text-white'
                        : 'border-white bg-white text-[#111111]'
                      : isLight
                        ? 'border-black/10 bg-white text-[#555555] hover:border-black/25'
                        : 'border-white/10 bg-[#1B1B1B] text-white/65 hover:border-white/25'
                  }`}
                >
                  All Years
                </button>
                {years.map((year) => {
                  const isCurrent = selectedYear === year;
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => {
                        setSelectedYear(year);
                        setSeriesVisibleCount(SERIES_PAGE_SIZE);
                        setTracksVisibleCount(TRACKS_PAGE_SIZE);
                      }}
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                        isCurrent
                          ? isLight
                            ? 'border-[#111111] bg-[#111111] text-white'
                            : 'border-white bg-white text-[#111111]'
                          : isLight
                            ? 'border-black/10 bg-white text-[#555555] hover:border-black/25'
                            : 'border-white/10 bg-[#1B1B1B] text-white/65 hover:border-white/25'
                      }`}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>

              {/* Sort & View Switch */}
              <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SeriesSortOption)}
                  aria-label="Sort teachings"
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium outline-none focus:border-primary ${
                    isLight
                      ? 'border-black/10 bg-white text-[#333333]'
                      : 'border-white/10 bg-[#1B1B1B] text-white/85'
                  }`}
                >
                  <option value="latest">Latest First</option>
                  <option value="most-tracks">Most Tracks</option>
                  <option value="alpha">Title (A–Z)</option>
                </select>

                <div
                  className={`inline-flex items-center rounded-lg border p-0.5 ${
                    isLight
                      ? 'border-black/10 bg-white'
                      : 'border-white/10 bg-[#1B1B1B]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setViewMode('series')}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                      viewMode === 'series'
                        ? 'bg-primary text-white shadow-sm'
                        : isLight
                          ? 'text-[#666666] hover:text-[#111111]'
                          : 'text-white/55 hover:text-white'
                    }`}
                  >
                    Series Covers
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('tracks')}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                      viewMode === 'tracks'
                        ? 'bg-primary text-white shadow-sm'
                        : isLight
                          ? 'text-[#666666] hover:text-[#111111]'
                          : 'text-white/55 hover:text-white'
                    }`}
                  >
                    Tracks List
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {filteredSermons.length === 0 ? (
            <div
              className={`rounded-2xl border p-12 text-center ${
                isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-[#191919]'
              }`}
            >
              <p className="text-lg font-bold">
                {selectedCategory === 'favorites' ? 'No Saved Teachings Yet' : 'No Matching Teachings Found'}
              </p>
              <p className={`mt-2 text-sm max-w-md mx-auto ${isLight ? 'text-[#666666]' : 'text-white/55'}`}>
                {selectedCategory === 'favorites'
                  ? 'Open any series or track and tap Save to keep your favorite messages ready here.'
                  : 'Try adjusting your search keywords, year, or topic filter.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  resetAllFilters();
                  setViewMode('series');
                }}
                className="mt-5 inline-flex items-center rounded-[4px] bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-primary-dark"
              >
                Show All Teachings
              </button>
            </div>
          ) : viewMode === 'series' ? (
            /* Series Covers Mode (5-Col Desktop / 2-Col Mobile) */
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-5">
                {filteredSeriesGroups.slice(0, seriesVisibleCount).map((group) => (
                  <SeriesCard
                    key={group.key}
                    group={group}
                    theme={theme}
                    isPlayingSeries={activeSeriesKey === group.key}
                    isSavedSeries={group.sermons.every((s) => savedIds.has(s.id))}
                    copiedKey={copiedKey}
                    onOpenSeries={setModalSeriesGroup}
                    onPlaySeries={(g) => handlePlayEntireSeries(g.sermons)}
                    onToggleSaveSeries={toggleSaveSeries}
                    onCopySeriesLink={handleCopySeriesLink}
                  />
                ))}
              </div>

              {seriesVisibleCount < filteredSeriesGroups.length && (
                <div className="pt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setSeriesVisibleCount((prev) => prev + SERIES_PAGE_SIZE)}
                    className={`rounded-[4px] border px-6 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                      isLight
                        ? 'border-black/15 bg-white text-[#1A1A1A] hover:border-black/35'
                        : 'border-white/15 bg-[#1B1B1B] text-white hover:border-white/35'
                    }`}
                  >
                    Load More Series ({filteredSeriesGroups.length - seriesVisibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Clean Hairline Tracks List Mode */
            <>
              <div
                className={`rounded-2xl border divide-y overflow-hidden ${
                  isLight
                    ? 'border-black/[0.08] bg-white divide-black/[0.08]'
                    : 'border-white/10 bg-[#191919] divide-white/10'
                }`}
              >
                {filteredTracksSorted.slice(0, tracksVisibleCount).map((sermon) => {
                  const isActive = activeSermon?.id === sermon.id;
                  const title = cleanSermonTitle(sermon);
                  const displaySeries = cleanSeriesTitle(sermon.series, sermon.year);
                  const dateLabel = formatShortDate(sermon.uploadedAt || sermon.date, sermon.year);
                  const isSaved = savedIds.has(sermon.id);
                  const isCopied = copiedKey === sermon.id;

                  return (
                    <div
                      key={sermon.id}
                      className={`flex items-center justify-between gap-3 px-4 py-3.5 transition-colors ${
                        isActive
                          ? isLight
                            ? 'bg-primary/[0.06]'
                            : 'bg-primary/10'
                          : isLight
                            ? 'hover:bg-black/[0.02]'
                            : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {/* Mini Square Cover */}
                        <div className="hidden sm:block h-11 w-11 shrink-0 overflow-hidden rounded-lg">
                          <SeriesArtwork
                            seriesTitle={sermon.series}
                            year={sermon.year}
                            thumbnail={sermon.thumbnail}
                            size="xs"
                          />
                        </div>

                        {/* Circular Play Button */}
                        <button
                          type="button"
                          onClick={() => handlePlaySermon(sermon)}
                          aria-label={`Play ${title}`}
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all ${
                            isActive
                              ? 'border-primary bg-primary text-white shadow-sm'
                              : isLight
                                ? 'border-black/20 text-[#141414] hover:border-primary hover:bg-primary hover:text-white'
                                : 'border-white/25 text-white hover:border-primary hover:bg-primary hover:text-white'
                          }`}
                        >
                          {isActive && isPlayingAudio ? (
                            <span className="flex items-end gap-0.5 h-3">
                              <span className="w-0.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s] h-2.5" />
                              <span className="w-0.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s] h-3" />
                              <span className="w-0.5 bg-white rounded-full animate-bounce h-1.5" />
                            </span>
                          ) : (
                            <svg className="ml-0.5 h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </button>

                        {/* Track Info */}
                        <div className="min-w-0 flex-1">
                          <h4
                            onClick={() => handlePlaySermon(sermon)}
                            className={`cursor-pointer truncate text-sm font-semibold ${
                              isActive ? 'text-primary' : ''
                            }`}
                          >
                            {title}
                          </h4>
                          <p className={`truncate text-xs mt-0.5 ${isLight ? 'text-[#666666]' : 'text-white/50'}`}>
                            {displaySeries} · {dateLabel}
                          </p>
                        </div>
                      </div>

                      {/* Track Quick Actions */}
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleSave(sermon.id)}
                          title={isSaved ? 'Remove from Saved' : 'Save message'}
                          aria-label="Save message"
                          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                            isSaved
                              ? 'text-red-500'
                              : isLight
                                ? 'text-black/35 hover:text-[#111111]'
                                : 'text-white/40 hover:text-white'
                          }`}
                        >
                          <svg className="h-4 w-4" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>

                        <a
                          href={generateWhatsAppShareUrl(sermon)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Share on WhatsApp"
                          aria-label="Share on WhatsApp"
                          className={`hidden sm:flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                            isLight
                              ? 'text-black/35 hover:text-emerald-600'
                              : 'text-white/40 hover:text-emerald-400'
                          }`}
                        >
                          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                          </svg>
                        </a>

                        <a
                          href={sermon.audioUrl}
                          download
                          title={`Download ${title}`}
                          aria-label={`Download ${title}`}
                          className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                            isLight
                              ? 'border-black/15 text-[#333333] hover:border-primary hover:text-primary'
                              : 'border-white/20 text-white/70 hover:border-primary hover:text-primary'
                          }`}
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleCopyTrackLink(sermon)}
                          title={isCopied ? 'Link copied!' : 'Copy link'}
                          aria-label="Copy sermon link"
                          className={`hidden sm:flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                            isLight
                              ? 'border-black/15 text-[#444444] hover:border-primary hover:text-primary'
                              : 'border-white/20 text-white/65 hover:border-primary hover:text-primary'
                          }`}
                        >
                          {isCopied ? (
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
                  );
                })}
              </div>

              {tracksVisibleCount < filteredTracksSorted.length && (
                <div className="pt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setTracksVisibleCount((prev) => prev + TRACKS_PAGE_SIZE)}
                    className={`rounded-[4px] border px-6 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                      isLight
                        ? 'border-black/15 bg-white text-[#1A1A1A] hover:border-black/35'
                        : 'border-white/15 bg-[#1B1B1B] text-white hover:border-white/35'
                    }`}
                  >
                    Load More Tracks ({filteredTracksSorted.length - tracksVisibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Series Modal */}
      <SeriesModal
        group={modalSeriesGroup}
        theme={theme}
        activeSermonId={activeSermon?.id}
        isPlayingAudio={isPlayingAudio}
        savedIds={savedIds}
        isOpen={Boolean(modalSeriesGroup)}
        onClose={() => setModalSeriesGroup(null)}
        onPlaySermon={(s) =>
          handlePlaySermon(s, modalSeriesGroup ? modalSeriesGroup.sermons : [s])
        }
        onPlayAll={handlePlayEntireSeries}
        onToggleSave={toggleSave}
      />

      {/* Sticky Audio Player */}
      <TeachingPlayer
        sermon={activeSermon}
        theme={theme}
        onClose={() => setActiveSermon(null)}
        onNext={handleNextTrack}
        onPrev={handlePrevTrack}
        hasNext={activeQueueIndex !== -1 && activeQueueIndex < playbackQueue.length - 1}
        hasPrev={activeQueueIndex > 0}
        isSaved={activeSermon ? savedIds.has(activeSermon.id) : false}
        onToggleSave={toggleSave}
        onPlayingChange={setIsPlayingAudio}
      />
    </div>
  );
}

export default function TeachingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAFA] pt-28 text-center text-sm font-medium text-[#666666]">
          Loading ELGCC Teachings Library...
        </div>
      }
    >
      <TeachingsContent />
    </Suspense>
  );
}
