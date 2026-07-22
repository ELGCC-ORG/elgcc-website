import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getYouTubeEmbedUrl,
  getYouTubeWatchUrl,
  liveConfig,
} from '@/lib/live';

export const metadata: Metadata = {
  title: liveConfig.isLive
    ? `LIVE: ${liveConfig.title} | ELGCC`
    : 'Live Meetings | ELGCC',
  description:
    'Watch ELGCC important meetings live on the website via YouTube, with Facebook as an alternate watch option.',
};

export default function LivePage() {
  const embedUrl = getYouTubeEmbedUrl(liveConfig.youtubeVideoId);
  const youtubeWatchUrl = getYouTubeWatchUrl(liveConfig.youtubeVideoId);
  const facebookWatchUrl = liveConfig.isLive
    ? liveConfig.facebookUrl || liveConfig.facebookPageUrl
    : liveConfig.facebookPageUrl;

  return (
    <div className="min-h-screen bg-dark pt-20">
      <header className="border-b border-primary/10 bg-dark-lighter py-12">
        <div className="container-custom max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            {liveConfig.isLive ? (
              <span className="inline-flex items-center gap-2 rounded bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                </span>
                Live now
              </span>
            ) : (
              <span className="inline-flex rounded bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white/70">
                Offline
              </span>
            )}
            <p className="text-primary text-xs font-bold uppercase tracking-[0.22em]">
              Meetings
            </p>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-white md:text-5xl">
            {liveConfig.isLive ? liveConfig.title : 'Live Meetings'}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/60 md:text-lg">
            {liveConfig.isLive ? liveConfig.description : liveConfig.nextMeetingLabel}
          </p>
        </div>
      </header>

      <main className="container-custom space-y-10 py-10 md:py-14">
        {liveConfig.isLive && embedUrl ? (
          <section className="mx-auto max-w-5xl">
            <div className="border border-white/10 bg-black">
              <div className="relative aspect-video w-full">
                <iframe
                  src={embedUrl}
                  title={liveConfig.title}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            </div>
            <p className="mt-3 text-sm text-white/45">
              If the player does not load, use the YouTube or Facebook buttons below.
            </p>
          </section>
        ) : (
          <section className="mx-auto max-w-3xl border border-white/10 bg-dark-card p-8 text-center md:p-12">
            <h2 className="text-2xl font-bold text-white">We are not live right now</h2>
            <p className="mt-3 text-white/55">
              When an important meeting is streaming, this page will show the live player automatically.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href={liveConfig.youtubeChannelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-[#FF0000] px-5 py-3 text-sm font-bold text-white"
              >
                Open YouTube channel
              </a>
              <a
                href={liveConfig.facebookPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-[#1877F2] px-5 py-3 text-sm font-bold text-white"
              >
                Open Facebook page
              </a>
            </div>
          </section>
        )}

        <section className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row">
          <a
            href={youtubeWatchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 border border-white/10 bg-dark-card px-5 py-3 text-sm font-bold text-white"
          >
            <svg className="h-5 w-5 text-[#FF0000]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            Watch on YouTube
          </a>
          <a
            href={facebookWatchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 border border-white/10 bg-dark-card px-5 py-3 text-sm font-bold text-white"
          >
            <svg className="h-5 w-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Watch on Facebook
          </a>
          <Link
            href="/teachings"
            className="inline-flex flex-1 items-center justify-center border border-white/10 bg-dark-card px-5 py-3 text-sm font-bold text-white"
          >
            Browse teachings
          </Link>
        </section>
      </main>
    </div>
  );
}
