'use client';

import { useEffect, useRef, useState } from 'react';
import { SeriesGroup, generateSeriesWhatsAppShareUrl } from '@/lib/teachings';
import SeriesArtwork from './SeriesArtwork';

interface SeriesCardProps {
  group: SeriesGroup;
  theme?: 'light' | 'dark';
  isPlayingSeries?: boolean;
  isSavedSeries?: boolean;
  copiedKey?: string | null;
  onOpenSeries: (group: SeriesGroup) => void;
  onPlaySeries: (group: SeriesGroup) => void;
  onToggleSaveSeries: (group: SeriesGroup) => void;
  onCopySeriesLink: (group: SeriesGroup) => void;
}

export default function SeriesCard({
  group,
  theme = 'light',
  isPlayingSeries = false,
  isSavedSeries = false,
  copiedKey = null,
  onOpenSeries,
  onPlaySeries,
  onToggleSaveSeries,
  onCopySeriesLink,
}: SeriesCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  const isLight = theme === 'light';
  const whatsappUrl = generateSeriesWhatsAppShareUrl(group);
  const isCopied = copiedKey === group.key;

  return (
    <div
      ref={cardRef}
      onClick={() => onOpenSeries(group)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenSeries(group);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open ${group.displaySeries}`}
      className={`group relative aspect-square w-full cursor-pointer rounded-xl transition-all duration-300 focus:outline-none ${
        isPlayingSeries
          ? `ring-2 ring-primary ring-offset-2 ${isLight ? 'ring-offset-[#FAFAFA]' : 'ring-offset-[#121212]'} shadow-xl`
          : isLight
            ? 'shadow-[0_6px_22px_rgba(0,0,0,0.09)] hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(0,0,0,0.18)]'
            : 'shadow-[0_8px_24px_rgba(0,0,0,0.45)] hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(0,0,0,0.65)]'
      }`}
    >
      {/* Clipped Square Artwork Container */}
      <div className="relative h-full w-full overflow-hidden rounded-xl">
        <SeriesArtwork
          seriesTitle={group.series}
          year={group.year}
          speaker={group.coverSpeaker}
          categoryLabel={group.categoryLabel}
          thumbnail={group.thumbnail}
          size="md"
          className="transition-transform duration-500 group-hover:scale-[1.03]"
        />

        {/* Subtle Dark Vignette on Hover */}
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25 transition-opacity duration-200 ${
            menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
          }`}
        />

        {/* Playing Indicator (Always visible when playing this series) */}
        {isPlayingSeries && (
          <div className="pointer-events-none absolute left-2.5 top-2.5 z-20 flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md group-hover:opacity-0 transition-opacity">
            <span className="flex items-end gap-0.5 h-2.5">
              <span className="w-0.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s] h-2" />
              <span className="w-0.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s] h-2.5" />
              <span className="w-0.5 bg-white rounded-full animate-bounce h-1.5" />
            </span>
            <span>Playing</span>
          </div>
        )}

        {/* Highlight Top-Left Play Circle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlaySeries(group);
          }}
          title="Play series from Part 1"
          aria-label={`Play ${group.displaySeries}`}
          className={`absolute left-2.5 top-2.5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-primary ${
            menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
          }`}
        >
          <svg className="ml-0.5 h-4 w-4 fill-current" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>

        {/* Highlight Top-Right Menu Trigger */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((prev) => !prev);
          }}
          title="More options"
          aria-label={`Options for ${group.displaySeries}`}
          className={`absolute right-2.5 top-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-all duration-200 hover:bg-black/70 ${
            menuOpen ? 'opacity-100 bg-black/75' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
          }`}
        >
          <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
            <circle cx="12" cy="5.5" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="12" cy="18.5" r="1.6" />
          </svg>
        </button>

        {/* Bottom Frosted Strip on Hover (Matching Reference Image 2 Card 5) */}
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-2 bg-black/60 px-3 py-2 text-[10px] font-semibold text-white backdrop-blur-md transition-all duration-200 ${
            menuOpen
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0'
          }`}
        >
          <span className="uppercase tracking-[0.14em] text-white/90 truncate">
            {group.categoryLabel}
          </span>
          <span className="shrink-0 text-white/85 tabular-nums">
            {group.count} {group.count === 1 ? 'track' : 'tracks'} · {group.latestDateLabel}
          </span>
        </div>
      </div>

      {/* Popover Action Menu */}
      {menuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-2 top-12 z-30 w-44 overflow-hidden rounded-xl border py-1 text-xs shadow-2xl ${
            isLight
              ? 'border-black/10 bg-white text-[#141414]'
              : 'border-white/15 bg-[#1F1F1F] text-white'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onOpenSeries(group);
            }}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
              isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'
            }`}
          >
            <span>View tracks ({group.count})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onPlaySeries(group);
            }}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left font-semibold text-primary transition-colors ${
              isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'
            }`}
          >
            <span>Play from Part 1</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onToggleSaveSeries(group);
              setMenuOpen(false);
            }}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
              isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'
            }`}
          >
            <span>{isSavedSeries ? '♥ Saved in Library' : '♡ Save Series'}</span>
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
              isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'
            }`}
          >
            <span>Share on WhatsApp</span>
          </a>
          <button
            type="button"
            onClick={() => {
              onCopySeriesLink(group);
              setMenuOpen(false);
            }}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
              isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'
            }`}
          >
            <span>{isCopied ? '✓ Link Copied' : 'Copy Series Link'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
