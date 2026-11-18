'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Sermon,
  cleanSermonTitle,
  cleanSeriesTitle,
  formatTime,
  getBrandedListenUrl,
  generateWhatsAppShareUrl,
} from '@/lib/teachings';
import SeriesArtwork from './SeriesArtwork';

interface TeachingPlayerProps {
  sermon: Sermon | null;
  theme?: 'light' | 'dark';
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  isSaved?: boolean;
  onToggleSave?: (sermonId: string) => void;
  onPlayingChange?: (playing: boolean) => void;
}

const SPEED_OPTIONS = [1, 1.25, 1.5, 1.75, 2, 0.75];

export default function TeachingPlayer({
  sermon,
  theme = 'dark',
  onClose,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  isSaved = false,
  onToggleSave,
  onPlayingChange,
}: TeachingPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackRateRef = useRef<number>(1);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const updatePlaying = (next: boolean) => {
    setIsPlaying(next);
    onPlayingChange?.(next);
  };

  // Sync playback rate without restarting current sermon
  useEffect(() => {
    playbackRateRef.current = playbackRate;
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // When active sermon changes, reset state and load audio
  useEffect(() => {
    if (!sermon) {
      updatePlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = playbackRateRef.current;
      setIsLoading(true);
      setCurrentTime(0);
      setDuration(0);

      // Check if there is saved resume time for this specific sermon
      try {
        const resumeRaw = localStorage.getItem(`elgcc_pos_${sermon.id}`);
        if (resumeRaw) {
          const parsed = parseFloat(resumeRaw);
          if (!isNaN(parsed) && parsed > 5) {
            audio.currentTime = parsed;
            setCurrentTime(parsed);
          }
        }
      } catch {
        // Ignore localStorage error
      }

      audio
        .play()
        .then(() => updatePlaying(true))
        .catch(() => updatePlaying(false))
        .finally(() => setIsLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sermon?.id]);

  // Save playback progress periodically for resume feature
  useEffect(() => {
    if (!sermon || currentTime <= 5) return;
    try {
      localStorage.setItem(`elgcc_pos_${sermon.id}`, currentTime.toString());
      localStorage.setItem(
        'elgcc_last_played',
        JSON.stringify({
          id: sermon.id,
          title: cleanSermonTitle(sermon),
          series: cleanSeriesTitle(sermon.series, sermon.year),
          time: currentTime,
          timestamp: Date.now(),
        })
      );
    } catch {
      // Ignore localStorage write error
    }
  }, [sermon, currentTime]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      updatePlaying(false);
    } else {
      audio
        .play()
        .then(() => updatePlaying(true))
        .catch(() => updatePlaying(false));
    }
  };

  const handleSkip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = Math.min(Math.max(audio.currentTime + seconds, 0), duration || Infinity);
    audio.currentTime = target;
    setCurrentTime(target);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = parseFloat(e.target.value);
    audio.currentTime = target;
    setCurrentTime(target);
  };

  const cycleSpeed = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(playbackRate);
    const nextRate = SPEED_OPTIONS[(currentIndex + 1) % SPEED_OPTIONS.length];
    setPlaybackRate(nextRate);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.muted = false;
      setIsMuted(false);
      audio.volume = volume;
    } else {
      audio.muted = true;
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audio) {
      audio.volume = val;
      audio.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const copyLink = async () => {
    if (!sermon) return;
    const link = getBrandedListenUrl(sermon.id);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy link:', link);
    }
  };

  if (!sermon) return null;

  const isLight = theme === 'light';
  const title = cleanSermonTitle(sermon);
  const displaySeries = cleanSeriesTitle(sermon.series, sermon.year);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const whatsappUrl = generateWhatsAppShareUrl(sermon);
  const scrubberClass = isLight ? 'player-scrubber-light' : 'player-scrubber';

  return (
    <>
      <audio
        ref={audioRef}
        src={sermon.audioUrl}
        preload="metadata"
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration || 0);
            setIsLoading(false);
          }
        }}
        onEnded={() => {
          updatePlaying(false);
          if (onNext) {
            onNext();
          }
        }}
        onWaiting={() => setIsLoading(true)}
        onError={() => {
          setIsLoading(false);
          updatePlaying(false);
        }}
        onPlaying={() => {
          setIsLoading(false);
          updatePlaying(true);
        }}
        onPause={() => updatePlaying(false)}
      />

      {/* Floating Sticky Player */}
      <div className="fixed inset-x-0 bottom-0 z-50 transition-transform duration-300">
        {/* Progress Accent Strip */}
        <div className={`relative h-1 w-full ${isLight ? 'bg-black/10' : 'bg-white/10'}`}>
          <div
            className="h-full bg-primary transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div
          className={`border-t px-3 py-2.5 backdrop-blur-md sm:px-6 sm:py-3.5 transition-colors ${
            isLight
              ? 'border-black/10 bg-white/95 text-[#141414] shadow-[0_-12px_40px_rgba(0,0,0,0.08)]'
              : 'border-white/10 bg-[#161616]/95 text-white shadow-2xl'
          }`}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-6">
            {/* Left: Series Artwork & Sermon Info */}
            <div className="flex min-w-0 flex-1 items-center gap-3 md:flex-initial md:w-72 lg:w-80">
              {/* Real Series Mini Artwork */}
              <div
                className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border shadow-sm ${
                  isLight ? 'border-black/10' : 'border-white/10'
                }`}
              >
                <SeriesArtwork
                  seriesTitle={sermon.series}
                  year={sermon.year}
                  thumbnail={sermon.thumbnail}
                  size="xs"
                />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
                    <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Title & Series */}
              <div className="min-w-0 flex-1">
                <h4
                  className={`truncate text-xs sm:text-sm font-bold tracking-wide ${
                    isLight ? 'text-[#141414]' : 'text-white'
                  }`}
                  title={title}
                >
                  {title}
                </h4>
                <p className={`truncate text-[11px] sm:text-xs ${isLight ? 'text-[#666666]' : 'text-white/50'}`}>
                  {displaySeries} · <span className="text-primary font-semibold">{sermon.year}</span>
                </p>
              </div>

              {/* Save/Favorite Heart Button */}
              {onToggleSave && (
                <button
                  type="button"
                  onClick={() => onToggleSave(sermon.id)}
                  className={`hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    isSaved
                      ? 'text-red-500 hover:text-red-400'
                      : isLight
                        ? 'text-black/35 hover:text-[#141414]'
                        : 'text-white/40 hover:text-white'
                  }`}
                  title={isSaved ? 'Remove from saved' : 'Save to My Library'}
                  aria-label="Save teaching"
                >
                  <svg className="h-4 w-4" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Center: Playback Controls & Scrubber */}
            <div className="flex flex-1 flex-col items-center max-w-xl">
              {/* Button Controls Row */}
              <div className="flex items-center gap-1.5 sm:gap-3">
                {/* Previous Track */}
                <button
                  type="button"
                  onClick={onPrev}
                  disabled={!hasPrev}
                  className={`hidden sm:flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-30 ${
                    isLight ? 'text-[#555555] hover:text-[#111111]' : 'text-white/60 hover:text-white'
                  }`}
                  title="Previous message"
                  aria-label="Previous track"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                  </svg>
                </button>

                {/* Skip Backward 15s */}
                <button
                  type="button"
                  onClick={() => handleSkip(-15)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors active:scale-95 ${
                    isLight ? 'text-[#444444] hover:text-[#111111]' : 'text-white/70 hover:text-white'
                  }`}
                  title="Rewind 15 seconds"
                  aria-label="Rewind 15 seconds"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                  </svg>
                  <span className="sr-only">15s back</span>
                </button>

                {/* Primary Play / Pause Button */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:bg-primary-dark active:scale-95"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isLoading ? (
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : isPlaying ? (
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg className="ml-0.5 h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {/* Skip Forward 15s */}
                <button
                  type="button"
                  onClick={() => handleSkip(15)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors active:scale-95 ${
                    isLight ? 'text-[#444444] hover:text-[#111111]' : 'text-white/70 hover:text-white'
                  }`}
                  title="Forward 15 seconds"
                  aria-label="Forward 15 seconds"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                  </svg>
                  <span className="sr-only">15s forward</span>
                </button>

                {/* Next Track */}
                <button
                  type="button"
                  onClick={onNext}
                  disabled={!hasNext}
                  className={`hidden sm:flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-30 ${
                    isLight ? 'text-[#555555] hover:text-[#111111]' : 'text-white/60 hover:text-white'
                  }`}
                  title="Next message in series"
                  aria-label="Next track"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                  </svg>
                </button>
              </div>

              {/* Scrubber Bar (Desktop & Tablet) */}
              <div className="hidden sm:flex w-full items-center gap-2 pt-1">
                <span className={`w-10 text-right text-[11px] font-mono ${isLight ? 'text-[#666666]' : 'text-white/50'}`}>
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.5}
                  value={currentTime}
                  onChange={handleSeek}
                  className={`${scrubberClass} flex-1`}
                  aria-label="Audio scrubber"
                />
                <span className={`w-10 text-[11px] font-mono ${isLight ? 'text-[#666666]' : 'text-white/50'}`}>
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Right: Tools & Sharing */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Playback Speed Toggle */}
              <button
                type="button"
                onClick={cycleSpeed}
                className={`flex h-8 items-center rounded-lg border px-2 text-[11px] font-bold transition-colors active:scale-95 ${
                  isLight
                    ? 'border-black/15 bg-black/[0.03] text-[#333333] hover:border-primary hover:text-primary'
                    : 'border-white/10 bg-white/5 text-white/80 hover:border-primary/50 hover:text-primary'
                }`}
                title="Change playback speed"
              >
                {playbackRate}x
              </button>

              {/* Volume Slider & Mute (Desktop) */}
              <div className="hidden lg:flex items-center gap-1.5 pl-1">
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    isLight ? 'text-[#555555] hover:text-[#111111]' : 'text-white/60 hover:text-white'
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className={`h-1 w-16 cursor-pointer accent-primary rounded-full ${
                    isLight ? 'bg-black/15' : 'bg-white/20'
                  }`}
                  aria-label="Volume slider"
                />
              </div>

              {/* 1-Click WhatsApp Share */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`hidden sm:flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                  isLight
                    ? 'border-black/10 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                    : 'border-white/10 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white'
                }`}
                title="Share this teaching to WhatsApp"
                aria-label="Share on WhatsApp"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
              </a>

              {/* Download Audio */}
              <a
                href={sermon.audioUrl}
                download
                className={`hidden sm:flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                  isLight
                    ? 'border-black/10 text-[#555555] hover:border-primary hover:text-primary'
                    : 'border-white/10 text-white/60 hover:border-primary/40 hover:text-white'
                }`}
                title="Download MP3"
                aria-label={`Download ${title}`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>

              {/* Copy Link */}
              <button
                type="button"
                onClick={copyLink}
                className={`hidden sm:flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                  isLight
                    ? 'border-black/10 text-[#555555] hover:border-primary hover:text-primary'
                    : 'border-white/10 text-white/60 hover:border-primary/40 hover:text-white'
                }`}
                title={copied ? 'Link copied!' : 'Copy sermon link'}
                aria-label="Copy link"
              >
                {copied ? (
                  <span className="text-[10px] font-bold text-primary">✓</span>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 8h10a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8a2 2 0 012-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
                  </svg>
                )}
              </button>

              {/* Close Player */}
              <button
                type="button"
                onClick={onClose}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  isLight
                    ? 'text-[#666666] hover:bg-black/5 hover:text-[#111111]'
                    : 'text-white/40 hover:bg-white/10 hover:text-white'
                }`}
                title="Close player"
                aria-label="Close player"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Scrubber & Time */}
          <div className="flex sm:hidden items-center justify-between gap-2 pt-2 px-1">
            <span className={`text-[10px] font-mono ${isLight ? 'text-[#666666]' : 'text-white/50'}`}>
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.5}
              value={currentTime}
              onChange={handleSeek}
              className={`${scrubberClass} flex-1`}
              aria-label="Audio scrubber"
            />
            <span className={`text-[10px] font-mono ${isLight ? 'text-[#666666]' : 'text-white/50'}`}>
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
