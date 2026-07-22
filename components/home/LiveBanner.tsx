import Link from 'next/link';
import { liveConfig } from '@/lib/live';

export default function LiveBanner() {
  if (!liveConfig.isLive) {
    return null;
  }

  return (
    <section className="border-b border-red-500/30 bg-[#1a0a0a]">
      <div className="container-custom py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex items-center gap-2 rounded bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-white">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              Live now
            </span>
            <div>
              <p className="font-bold text-white">{liveConfig.title}</p>
              <p className="text-sm text-white/60">Streaming now — watch on the website</p>
            </div>
          </div>
          <Link
            href="/live"
            className="inline-flex items-center justify-center bg-primary px-5 py-2.5 text-sm font-bold text-dark"
          >
            Watch live
          </Link>
        </div>
      </div>
    </section>
  );
}
