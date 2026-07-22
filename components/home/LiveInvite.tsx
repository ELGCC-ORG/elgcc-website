import Link from 'next/link';
import { liveConfig } from '@/lib/live';

export default function LiveInvite() {
  if (liveConfig.isLive) {
    return (
      <section className="border-y border-red-500/30 bg-[#1a0a0a]">
        <div className="container-custom py-8 md:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 bg-red-600 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                </span>
                Live now
              </span>
              <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">
                {liveConfig.title}
              </h2>
              <p className="mt-3 text-base text-white/65 md:text-lg">
                We are streaming this meeting now. Watch here on the website.
              </p>
            </div>
            <Link
              href="/live"
              className="inline-flex items-center justify-center bg-primary px-8 py-4 text-sm font-bold text-dark"
            >
              Watch live
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border-y border-primary/15 bg-dark-lighter">
      <div className="container-custom py-12 md:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_auto] lg:items-center">
          <div>
            <p className="text-primary text-xs font-bold uppercase tracking-[0.22em]">
              Live meetings
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
              Join important meetings online
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/60 md:text-lg">
              {liveConfig.nextMeetingLabel}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href="/live"
              className="inline-flex items-center justify-center gap-2 bg-primary px-7 py-3.5 text-sm font-bold text-dark"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-600 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
              </span>
              Go to Live page
            </Link>
            <Link
              href="/teachings"
              className="inline-flex items-center justify-center border border-white/15 px-7 py-3.5 text-sm font-semibold text-white/80"
            >
              Listen to teachings
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
