'use client';

import { useEffect } from 'react';
import {
  Sermon,
  cleanSermonTitle,
  cleanSeriesTitle,
  getTrackLabel,
  generateWhatsAppShareUrl,
  DEFAULT_SPEAKER,
} from '@/lib/teachings';

interface SeriesModalProps {
  seriesTitle: string;
  year: number;
  sermons: Sermon[];
  activeSermonId?: string | null;
  savedIds: Set<string>;
  isOpen: boolean;
  onClose: () => void;
  onPlaySermon: (sermon: Sermon) => void;
  onPlayAll: (sermons: Sermon[]) => void;
  onToggleSave: (sermonId: string) => void;
}

export default function SeriesModal({
  seriesTitle,
  year,
  sermons,
  activeSermonId,
  savedIds,
  isOpen,
  onClose,
  onPlaySermon,
  onPlayAll,
  onToggleSave,
}: SeriesModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayTitle = cleanSeriesTitle(seriesTitle, year);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl border border-white/10 bg-[#1A1A1A] shadow-2xl overflow-hidden">
        {/* Header Artwork & Info */}
        <div className="relative border-b border-white/10 bg-gradient-to-br from-[#242424] to-[#181818] p-6 sm:p-8">
          {/* Subtle Ambient Glow */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close series view"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Album Cover Icon */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary/30 to-secondary/30 border border-primary/30 text-primary shadow-xl">
              <svg className="h-10 w-10 text-primary-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
                  {year} Series
                </span>
                <span className="text-xs text-white/40">
                  {sermons.length} {sermons.length === 1 ? 'part' : 'parts / messages'}
                </span>
              </div>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {displayTitle}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-white/50">
                Speaker: {sermons[0]?.speaker || DEFAULT_SPEAKER}
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onPlayAll(sermons)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-dark shadow-lg shadow-primary/20 transition-all hover:scale-105 hover:bg-primary-light active:scale-95"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Play All from Part 1
            </button>
          </div>
        </div>

        {/* Scrollable Tracklist */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3 px-1">
            Tracks in this series ({sermons.length})
          </p>

          {sermons.map((sermon, idx) => {
            const isPlayingThis = activeSermonId === sermon.id;
            const title = cleanSermonTitle(sermon);
            const trackLabel = getTrackLabel(sermon.title);
            const isSaved = savedIds.has(sermon.id);
            const whatsappUrl = generateWhatsAppShareUrl(sermon);

            return (
              <div
                key={sermon.id}
                className={`group flex items-center gap-3 rounded-2xl border p-3 transition-all ${
                  isPlayingThis
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                }`}
              >
                {/* Track Number / Play Indicator */}
                <button
                  type="button"
                  onClick={() => onPlaySermon(sermon)}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold transition-all ${
                    isPlayingThis
                      ? 'bg-primary text-dark shadow-md'
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
                    <span className="text-xs font-mono">{(idx + 1).toString().padStart(2, '0')}</span>
                  )}
                </button>

                {/* Track Details */}
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onPlaySermon(sermon)}>
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm font-semibold leading-snug line-clamp-1 ${isPlayingThis ? 'text-primary' : 'text-white/90 group-hover:text-white'}`}>
                      {title}
                    </h4>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/40">
                    {trackLabel && <span className="font-semibold text-primary/80">{trackLabel}</span>}
                    <span>{sermon.speaker || DEFAULT_SPEAKER}</span>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-1">
                  {/* Save/Favorite */}
                  <button
                    type="button"
                    onClick={() => onToggleSave(sermon.id)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                      isSaved ? 'text-red-400 hover:text-red-300' : 'text-white/30 hover:text-white'
                    }`}
                    title={isSaved ? 'Remove from saved' : 'Save message'}
                    aria-label="Save message"
                  >
                    <svg className="h-4 w-4" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>

                  {/* WhatsApp Share */}
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition-colors hover:text-emerald-400"
                    title="Share on WhatsApp"
                    aria-label="Share on WhatsApp"
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                    </svg>
                  </a>

                  {/* Download */}
                  <a
                    href={sermon.audioUrl}
                    download
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition-colors hover:text-white"
                    title="Download MP3"
                    aria-label={`Download ${title}`}
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
      </div>
    </div>
  );
}
