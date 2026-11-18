'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Sermon,
  SeriesGroup,
  DEFAULT_SPEAKER,
  cleanSermonTitle,
  formatShortDate,
  getTrackLabel,
  getBrandedListenUrl,
  getSeriesShareUrl,
  generateWhatsAppShareUrl,
  generateSeriesWhatsAppShareUrl,
} from '@/lib/teachings';
import SeriesArtwork from './SeriesArtwork';

interface SeriesModalProps {
  group: SeriesGroup | null;
  theme?: 'light' | 'dark';
  activeSermonId?: string | null;
  isPlayingAudio?: boolean;
  savedIds: Set<string>;
  isOpen: boolean;
  onClose: () => void;
  onPlaySermon: (sermon: Sermon) => void;
  onPlayAll: (sermons: Sermon[]) => void;
  onToggleSave: (sermonId: string) => void;
}

export default function SeriesModal({
  group,
  theme = 'light',
  activeSermonId,
  isPlayingAudio = false,
  savedIds,
  isOpen,
  onClose,
  onPlaySermon,
  onPlayAll,
  onToggleSave,
}: SeriesModalProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [seriesLinkCopied, setSeriesLinkCopied] = useState(false);
  const [openTrackMenuId, setOpenTrackMenuId] = useState<string | null>(null);
  const [copiedTrackId, setCopiedTrackId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);

  const shareRef = useRef<HTMLDivElement | null>(null);
  const downloadTimersRef = useRef<number[]>([]);

  const clearDownloadTimers = () => {
    downloadTimersRef.current.forEach((id) => window.clearTimeout(id));
    downloadTimersRef.current = [];
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (openTrackMenuId) {
          setOpenTrackMenuId(null);
        } else if (shareOpen) {
          setShareOpen(false);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, openTrackMenuId, shareOpen]);

  // Reset transient menus/timers when modal closes or switches group
  useEffect(() => {
    if (!isOpen) {
      setShareOpen(false);
      setOpenTrackMenuId(null);
      clearDownloadTimers();
      setDownloadProgress(null);
    }
  }, [isOpen, group?.key]);

  useEffect(() => {
    return () => {
      clearDownloadTimers();
    };
  }, []);

  useEffect(() => {
    if (!shareOpen && !openTrackMenuId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
      const target = e.target as HTMLElement;
      if (!target.closest('[data-track-menu]')) {
        setOpenTrackMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [shareOpen, openTrackMenuId]);

  if (!isOpen || !group) return null;

  const isLight = theme === 'light';
  const sermons = group.sermons;

  const handleDownloadAll = () => {
    if (downloadProgress) {
      clearDownloadTimers();
      setDownloadProgress(null);
      return;
    }

    const total = sermons.length;
    if (total === 0) return;

    setDownloadProgress({ current: 1, total });

    sermons.forEach((sermon, idx) => {
      const timerId = window.setTimeout(() => {
        const anchor = document.createElement('a');
        anchor.href = sermon.audioUrl;
        anchor.download = '';
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);

        if (idx + 1 >= total) {
          const resetTimer = window.setTimeout(() => setDownloadProgress(null), 1200);
          downloadTimersRef.current.push(resetTimer);
        } else {
          setDownloadProgress({ current: idx + 2, total });
        }
      }, idx * 600);

      downloadTimersRef.current.push(timerId);
    });
  };

  const handleShareButton = async () => {
    const shareUrl = getSeriesShareUrl(group.slug, window.location.origin);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: group.displaySeries,
          text: `${group.displaySeries} by ${group.speaker} (${group.count} ${group.count === 1 ? 'track' : 'tracks'})`,
          url: shareUrl,
        });
        return;
      } catch {
        // Fall back to popover menu if cancelled or unsupported
      }
    }
    setShareOpen((prev) => !prev);
  };

  const handleCopySeriesLink = async () => {
    const shareUrl = getSeriesShareUrl(group.slug, window.location.origin);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setSeriesLinkCopied(true);
      window.setTimeout(() => setSeriesLinkCopied(false), 2000);
    } catch {
      window.prompt('Copy series link:', shareUrl);
    }
  };

  const handleCopyTrackLink = async (sermon: Sermon) => {
    const url = getBrandedListenUrl(sermon.id, window.location.origin);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedTrackId(sermon.id);
      window.setTimeout(() => setCopiedTrackId((cur) => (cur === sermon.id ? null : cur)), 2000);
    } catch {
      window.prompt('Copy listen link:', url);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-black/45 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={group.displaySeries}
    >
      {/* Modal Dialog Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border shadow-2xl animate-scale-in ${
          isLight
            ? 'bg-[#EFEFED] border-black/10 text-[#141414]'
            : 'bg-[#1B1B1B] border-white/10 text-white'
        }`}
      >
        {/* Close Button (Top-right) */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close series modal"
          className={`absolute right-4 top-4 sm:right-5 sm:top-5 z-20 flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
            isLight
              ? 'bg-[#111111] text-white sm:bg-transparent sm:text-[#555555] sm:border sm:border-black/15 sm:hover:border-black/40 sm:hover:text-[#111111]'
              : 'bg-white/15 text-white sm:bg-transparent sm:border sm:border-white/20 sm:text-white/70 sm:hover:border-white/50 sm:hover:text-white'
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Responsive 2-Column Content */}
        <div className="grid grid-cols-1 md:grid-cols-[290px_1fr] lg:grid-cols-[330px_1fr] gap-6 md:gap-9 lg:gap-10 p-5 sm:p-7 md:p-10">
          {/* Artwork Column */}
          <div className="w-[215px] sm:w-[250px] mx-auto mt-3 md:mt-0 md:w-full">
            <div className="overflow-hidden rounded-xl shadow-[0_24px_50px_rgba(0,0,0,0.22)]">
              <SeriesArtwork
                seriesTitle={group.series}
                year={group.year}
                speaker={group.coverSpeaker}
                categoryLabel={group.categoryLabel}
                thumbnail={group.thumbnail}
                size="lg"
              />
            </div>
          </div>

          {/* Series Metadata, Actions & Tracklist Column */}
          <div className="min-w-0 flex flex-col">
            {/* Category Pill */}
            <div>
              <span
                className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-medium ${
                  isLight
                    ? 'border-black/15 bg-white/60 text-[#555555]'
                    : 'border-white/15 bg-white/5 text-white/75'
                }`}
              >
                {group.categoryLabel}
              </span>
            </div>

            {/* Title */}
            <h2 className="mt-3 text-xl sm:text-2xl lg:text-[30px] font-extrabold tracking-tight leading-[1.15]">
              {group.displaySeries}
            </h2>

            {/* Speaker · Date · Track Count */}
            <p className={`mt-2 text-xs sm:text-sm ${isLight ? 'text-[#666666]' : 'text-white/60'}`}>
              {group.speaker} · {group.latestDateLabel} · {group.count} {group.count === 1 ? 'track' : 'tracks'}
            </p>

            {/* Primary Actions Row */}
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => onPlayAll(sermons)}
                className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-primary px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-primary-dark active:scale-[0.99]"
              >
                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>PLAY ALL</span>
              </button>

              {sermons.length > 1 && (
                <button
                  type="button"
                  onClick={handleDownloadAll}
                  className={`hidden sm:inline-flex items-center justify-center gap-2 rounded-[4px] border px-5 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                    isLight
                      ? 'border-black/20 bg-white/70 text-[#1A1A1A] hover:border-black/40 hover:bg-white'
                      : 'border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/10'
                  }`}
                >
                  {downloadProgress
                    ? `Downloading ${downloadProgress.current}/${downloadProgress.total}...`
                    : 'DOWNLOAD ALL'}
                </button>
              )}

              {/* Share Button & Popover */}
              <div ref={shareRef} className="relative">
                <button
                  type="button"
                  onClick={handleShareButton}
                  aria-label="Share series"
                  title="Share series"
                  className={`flex h-10 w-10 items-center justify-center rounded-[4px] transition-colors ${
                    isLight
                      ? 'text-[#444444] hover:bg-black/5 hover:text-[#111111]'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0-12l-4 4m4-4l4 4" />
                  </svg>
                </button>

                {shareOpen && (
                  <div
                    className={`absolute left-0 sm:left-auto sm:right-0 top-12 z-30 w-48 overflow-hidden rounded-xl border py-1 text-xs shadow-2xl ${
                      isLight
                        ? 'border-black/10 bg-white text-[#141414]'
                        : 'border-white/15 bg-[#222222] text-white'
                    }`}
                  >
                    <a
                      href={generateSeriesWhatsAppShareUrl(
                        group,
                        typeof window !== 'undefined' ? window.location.origin : undefined
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShareOpen(false)}
                      className={`block px-3.5 py-2.5 transition-colors ${
                        isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'
                      }`}
                    >
                      Share on WhatsApp
                    </a>
                    <button
                      type="button"
                      onClick={handleCopySeriesLink}
                      className={`block w-full px-3.5 py-2.5 text-left transition-colors ${
                        isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'
                      }`}
                    >
                      {seriesLinkCopied ? '✓ Link Copied!' : 'Copy Series Link'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Clean Hairline Tracklist */}
            <div
              className={`mt-6 border-t divide-y md:max-h-[340px] md:overflow-y-auto md:pr-1 ${
                isLight ? 'border-black/10 divide-black/10' : 'border-white/10 divide-white/10'
              }`}
            >
              {sermons.map((sermon, idx) => {
                const isActive = activeSermonId === sermon.id;
                const cleaned = cleanSermonTitle(sermon);
                const trackFallback = getTrackLabel(sermon.title);
                const trackName =
                  cleaned.toLowerCase() === group.displaySeries.toLowerCase() && trackFallback
                    ? trackFallback
                    : cleaned || `Track ${idx + 1}`;
                const trackDate = formatShortDate(sermon.uploadedAt || sermon.date, sermon.year);
                const isSaved = savedIds.has(sermon.id);
                const menuOpen = openTrackMenuId === sermon.id;

                return (
                  <div
                    key={sermon.id}
                    className={`relative flex items-center justify-between gap-3 py-3.5 transition-colors ${
                      isActive
                        ? isLight
                          ? 'bg-primary/[0.06] -mx-2 px-2 rounded-lg'
                          : 'bg-primary/10 -mx-2 px-2 rounded-lg'
                        : ''
                    }`}
                  >
                    {/* Left: Circular Play + Track Name & Date */}
                    <button
                      type="button"
                      onClick={() => onPlaySermon(sermon)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left group"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all ${
                          isActive
                            ? 'border-primary bg-primary text-white shadow-sm'
                            : isLight
                              ? 'border-black/20 text-[#141414] group-hover:border-primary group-hover:bg-primary group-hover:text-white'
                              : 'border-white/25 text-white group-hover:border-primary group-hover:bg-primary group-hover:text-white'
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
                      </span>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-medium truncate ${
                            isActive ? 'font-bold text-primary' : ''
                          }`}
                        >
                          {trackName}
                        </p>
                        {(group.isMultiSpeaker || trackDate) && (
                          <p className={`text-[11px] mt-0.5 truncate ${isLight ? 'text-[#777777]' : 'text-white/45'}`}>
                            {group.isMultiSpeaker
                              ? `${sermon.speaker || DEFAULT_SPEAKER}${trackDate ? ` · ${trackDate}` : ''}`
                              : trackDate}
                          </p>
                        )}
                      </div>
                    </button>

                    {/* Right: Download Circle + Overflow Menu */}
                    <div className="flex shrink-0 items-center gap-1.5" data-track-menu>
                      <a
                        href={sermon.audioUrl}
                        download
                        title={`Download ${trackName}`}
                        aria-label={`Download ${trackName}`}
                        className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                          isLight
                            ? 'border-black/20 text-[#333333] hover:border-primary hover:text-primary'
                            : 'border-white/20 text-white/75 hover:border-primary hover:text-primary'
                        }`}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenTrackMenuId(menuOpen ? null : sermon.id)}
                          aria-label={`More actions for ${trackName}`}
                          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                            isLight
                              ? 'text-[#555555] hover:bg-black/5 hover:text-[#111111]'
                              : 'text-white/60 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                            <circle cx="5.5" cy="12" r="1.5" />
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="18.5" cy="12" r="1.5" />
                          </svg>
                        </button>

                        {menuOpen && (
                          <div
                            className={`absolute right-0 bottom-9 z-30 w-44 overflow-hidden rounded-xl border py-1 text-xs shadow-2xl ${
                              isLight
                                ? 'border-black/10 bg-white text-[#141414]'
                                : 'border-white/15 bg-[#242424] text-white'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                onToggleSave(sermon.id);
                                setOpenTrackMenuId(null);
                              }}
                              className={`block w-full px-3.5 py-2 text-left transition-colors ${
                                isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'
                              }`}
                            >
                              {isSaved ? '♥ Remove from Saved' : '♡ Save Message'}
                            </button>
                            <a
                              href={generateWhatsAppShareUrl(
                                sermon,
                                typeof window !== 'undefined' ? window.location.origin : undefined
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setOpenTrackMenuId(null)}
                              className={`block px-3.5 py-2 transition-colors ${
                                isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'
                              }`}
                            >
                              Share on WhatsApp
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                handleCopyTrackLink(sermon);
                                setOpenTrackMenuId(null);
                              }}
                              className={`block w-full px-3.5 py-2 text-left transition-colors ${
                                isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'
                              }`}
                            >
                              {copiedTrackId === sermon.id ? '✓ Link Copied' : 'Copy Listen Link'}
                            </button>
                            <Link
                              href={`/listen/${encodeURIComponent(sermon.id)}`}
                              onClick={() => setOpenTrackMenuId(null)}
                              className={`block px-3.5 py-2 transition-colors ${
                                isLight ? 'hover:bg-black/5' : 'hover:bg-white/10'
                              }`}
                            >
                              Open Listen Page ↗
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
