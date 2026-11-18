'use client';

import { useEffect, useState } from 'react';
import { SeriesGroup } from '@/lib/teachings';
import SeriesArtwork from './SeriesArtwork';

interface HeroCarouselProps {
  groups: SeriesGroup[];
  theme: 'light' | 'dark';
  activeSeriesKey?: string | null;
  onOpenSeries: (group: SeriesGroup) => void;
  onPlaySeries: (group: SeriesGroup) => void;
}

export default function HeroCarousel({
  groups,
  theme,
  activeSeriesKey,
  onOpenSeries,
  onPlaySeries,
}: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const count = groups.length;

  useEffect(() => {
    if (count <= 1 || isPaused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % count);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [count, isPaused]);

  if (count === 0) return null;

  const safeIndex = activeIndex % count;
  const current = groups[safeIndex];
  const isLight = theme === 'light';
  const isPlayingCurrent = activeSeriesKey === current.key;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev - 1 + count) % count);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev + 1) % count);
  };

  const dotsRow = (
    <div className="flex items-center gap-1.5">
      {groups.map((g, idx) => {
        const isCurrent = idx === safeIndex;
        return (
          <button
            key={g.key}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveIndex(idx);
            }}
            aria-label={`View featured series ${idx + 1}: ${g.displaySeries}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              isCurrent
                ? 'w-5 bg-primary'
                : isLight
                  ? 'w-1.5 bg-black/15 hover:bg-black/30'
                  : 'w-1.5 bg-white/20 hover:bg-white/40'
            }`}
          />
        );
      })}
    </div>
  );

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`relative w-full max-w-[440px] mx-auto lg:ml-auto rounded-2xl border p-3.5 sm:p-4 transition-colors duration-300 ${
        isLight
          ? 'bg-white border-black/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.09)]'
          : 'bg-[#1B1B1B] border-white/10 shadow-2xl'
      }`}
    >
      {/* Square Artwork Showcase */}
      <div
        onClick={() => onOpenSeries(current)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenSeries(current);
          }
        }}
        className="group relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl"
      >
        <SeriesArtwork
          key={current.key}
          seriesTitle={current.series}
          year={current.year}
          speaker={current.coverSpeaker}
          categoryLabel={current.categoryLabel}
          thumbnail={current.thumbnail}
          size="lg"
          className="transition-transform duration-500 group-hover:scale-[1.02]"
        />

        {/* Prev / Next Chevrons */}
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous featured teaching"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/25 text-white backdrop-blur-md opacity-80 transition-all hover:opacity-100 hover:bg-black/45"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next featured teaching"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/25 text-white backdrop-blur-md opacity-80 transition-all hover:opacity-100 hover:bg-black/45"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Bottom Metadata & Play Footer */}
      <div className="pt-3.5 px-1 flex items-center justify-between gap-3">
        <div
          onClick={() => onOpenSeries(current)}
          className="min-w-0 flex-1 cursor-pointer"
        >
          <p
            className={`text-[10px] font-bold uppercase tracking-[0.16em] truncate ${
              isLight ? 'text-[#666666]' : 'text-white/55'
            }`}
          >
            {safeIndex === 0 ? 'LATEST' : 'RECENT'} · {current.latestDateLabel.toUpperCase()}
          </p>
          <p
            className={`mt-0.5 text-xs font-medium truncate ${
              isLight ? 'text-[#444444]' : 'text-white/75'
            }`}
          >
            {current.speaker} · {current.count} {current.count === 1 ? 'track' : 'tracks'}
          </p>
        </div>

        {/* Desktop inline indicator dots */}
        {count > 1 && <div className="hidden sm:flex shrink-0">{dotsRow}</div>}

        {/* Solid ELGCC Olive Play Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlaySeries(current);
          }}
          aria-label={`Play ${current.displaySeries}`}
          title={`Play ${current.displaySeries} from Part 1`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-transform hover:scale-105 hover:bg-primary-dark active:scale-95"
        >
          {isPlayingCurrent ? (
            <div className="flex items-end gap-0.5 h-4">
              <span className="w-1 bg-white rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
              <span className="w-1 bg-white rounded-full animate-bounce [animation-delay:-0.15s] h-4" />
              <span className="w-1 bg-white rounded-full animate-bounce h-2" />
            </div>
          ) : (
            <svg className="ml-0.5 h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile centered indicator dots (matching Reference Image 6) */}
      {count > 1 && (
        <div className="flex sm:hidden justify-center pt-2.5 pb-0.5">
          {dotsRow}
        </div>
      )}
    </div>
  );
}
