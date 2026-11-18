'use client';

import Link from 'next/link';
import { liveConfig } from '@/lib/live';

interface LiveBroadcastBannerProps {
  theme: 'light' | 'dark';
}

const METER_HEIGHTS = [35, 70, 48, 92, 60, 82, 42, 74];

export default function LiveBroadcastBanner({ theme }: LiveBroadcastBannerProps) {
  const isLight = theme === 'light';

  return (
    <section aria-label="ELGCC Live Broadcast">
      {/* Section Header */}
      <div className="mb-5">
        <p
          className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
            isLight ? 'text-[#777777]' : 'text-white/45'
          }`}
        >
          ELGCC LIVE
        </p>
        <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight">
          {liveConfig.isLive ? 'On air, live now.' : 'Live Broadcast.'}
        </h2>
      </div>

      {/* Horizontal Card */}
      <div
        className={`rounded-2xl border p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 transition-colors ${
          isLight
            ? 'bg-white border-black/[0.08] shadow-[0_12px_36px_rgba(0,0,0,0.05)]'
            : 'bg-[#191919] border-white/10 shadow-xl'
        }`}
      >
        <div className="min-w-0 flex-1">
          {/* Status Indicator */}
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]">
            <span className="relative flex h-2 w-2">
              {liveConfig.isLive && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  liveConfig.isLive ? 'bg-red-500' : 'bg-primary'
                }`}
              />
            </span>
            <span className={liveConfig.isLive ? 'text-red-500' : 'text-primary'}>
              {liveConfig.isLive ? 'LIVE NOW' : 'ONLINE STREAM'}
            </span>
          </div>

          {/* Title & Description */}
          <h3 className="mt-2 text-xl sm:text-2xl font-extrabold tracking-tight">
            {liveConfig.title}
          </h3>
          <p className={`mt-1.5 text-sm leading-relaxed max-w-xl ${isLight ? 'text-[#555555]' : 'text-white/65'}`}>
            {liveConfig.isLive ? liveConfig.description : liveConfig.nextMeetingLabel}
          </p>

          {/* Minimal Audio Meter Bars (matching Image 7) */}
          <div className="mt-4 flex items-end gap-1 h-4" aria-hidden="true">
            {METER_HEIGHTS.map((pct, idx) => (
              <span
                key={idx}
                className="w-1 rounded-full bg-primary/80"
                style={{ height: `${pct}%` }}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <Link
            href="/live"
            className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-primary px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-primary-dark"
          >
            <span>WATCH / LISTEN LIVE →</span>
          </Link>

          <div className="flex items-center gap-2">
            <a
              href={liveConfig.youtubeChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center rounded-[4px] border px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                isLight
                  ? 'border-black/15 text-[#333333] hover:border-black/35 hover:bg-black/[0.03]'
                  : 'border-white/15 text-white/80 hover:border-white/35 hover:bg-white/5'
              }`}
            >
              YouTube
            </a>
            <a
              href={liveConfig.facebookPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center rounded-[4px] border px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                isLight
                  ? 'border-black/15 text-[#333333] hover:border-black/35 hover:bg-black/[0.03]'
                  : 'border-white/15 text-white/80 hover:border-white/35 hover:bg-white/5'
              }`}
            >
              Facebook
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
