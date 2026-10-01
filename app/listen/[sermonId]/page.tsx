import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  allSermons,
  cleanSeriesTitle,
  cleanSermonTitle,
  DEFAULT_SPEAKER,
  generateWhatsAppShareUrl,
  getAudioType,
  getTrackLabel,
} from '@/lib/teachings';

interface ListenPageProps {
  params: {
    sermonId: string;
  };
}

export async function generateMetadata({ params }: ListenPageProps): Promise<Metadata> {
  const sermonId = decodeURIComponent(params.sermonId);
  const sermon = allSermons.find((item) => item.id === sermonId);

  if (!sermon || sermon.unavailable) {
    return {
      title: 'Teaching Not Found | ELGCC',
    };
  }

  const title = cleanSermonTitle(sermon);
  const series = cleanSeriesTitle(sermon.series, sermon.year);
  const speaker = sermon.speaker || DEFAULT_SPEAKER;
  const description = `Listen to "${title}" from the series "${series}" (${sermon.year}) by ${speaker} on Eternal Life Global Community Church.`;

  return {
    title: `${title} — ${speaker} | ELGCC`,
    description,
    openGraph: {
      title: `${title} — ${speaker}`,
      description,
      type: 'music.song',
      siteName: 'Eternal Life Global Community Church (ELGCC)',
      images: [
        {
          url: '/images/elgcc-logo1.png',
          width: 800,
          height: 600,
          alt: `${title} - ELGCC Teaching`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} — ${speaker}`,
      description,
    },
  };
}

export default function ListenPage({ params }: ListenPageProps) {
  const sermonId = decodeURIComponent(params.sermonId);
  const sermon = allSermons.find((item) => item.id === sermonId);

  if (!sermon || sermon.unavailable) {
    notFound();
  }

  const title = cleanSermonTitle(sermon);
  const displaySeries = cleanSeriesTitle(sermon.series, sermon.year);
  const trackLabel = getTrackLabel(sermon.title);
  const speaker = sermon.speaker || DEFAULT_SPEAKER;
  const whatsappUrl = generateWhatsAppShareUrl(sermon);

  // Related sermons in the same series
  const siblingSermons = allSermons.filter(
    (s) => s.series === sermon.series && s.year === sermon.year && s.id !== sermon.id && !s.unavailable
  );

  return (
    <div className="min-h-screen bg-[#141414] text-white pt-24 pb-20">
      <div className="container-custom max-w-4xl">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/teachings"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/60 hover:text-primary transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Audio Library
          </Link>
        </div>

        {/* Hero Card */}
        <article className="overflow-hidden rounded-3xl border border-white/10 bg-[#1E1E1E] shadow-2xl">
          {/* Top Series Header */}
          <div className="border-b border-white/10 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <span className="rounded-full bg-primary/20 px-3 py-0.5">{sermon.year} Series</span>
              {trackLabel && (
                <span className="rounded-full bg-white/10 px-3 py-0.5 text-white/80">{trackLabel}</span>
              )}
            </div>

            <p className="mt-3 text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-white/50">
              {displaySeries}
            </p>
            <h1 className="mt-2 text-2xl sm:text-4xl font-extrabold text-white leading-tight">
              {title}
            </h1>
            <p className="mt-2 text-sm text-primary-light font-medium">
              Minister: {speaker}
            </p>
          </div>

          {/* Embedded Audio Stream Player */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[#141414] p-4 sm:p-5">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                Listen Online
              </p>
              <audio
                controls
                autoPlay
                preload="metadata"
                className="w-full h-11"
              >
                <source src={sermon.audioUrl} type={getAudioType(sermon.audioUrl)} />
                Your browser does not support the audio element.
              </audio>
            </div>

            {/* Quick Actions Row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* WhatsApp Share */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 hover:bg-emerald-500"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                Share on WhatsApp
              </a>

              {/* Direct Download */}
              <a
                href={sermon.audioUrl}
                download
                className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-xs sm:text-sm font-semibold text-white transition-colors hover:border-primary/40 hover:text-primary"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download MP3
              </a>

              {/* Full Library Link */}
              <Link
                href="/teachings"
                className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs sm:text-sm font-bold text-dark transition-transform hover:scale-105 hover:bg-primary-light"
              >
                Explore Full Library →
              </Link>
            </div>
          </div>
        </article>

        {/* More in this series */}
        {siblingSermons.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-bold text-white mb-4">
              More Messages in <span className="text-primary">{displaySeries}</span> ({siblingSermons.length})
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {siblingSermons.slice(0, 6).map((sibling) => (
                <Link
                  key={sibling.id}
                  href={`/listen/${encodeURIComponent(sibling.id)}`}
                  className="group flex items-center justify-between rounded-xl border border-white/10 bg-[#1E1E1E] p-4 transition-all hover:border-primary/40 hover:bg-[#252525]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-primary uppercase">{getTrackLabel(sibling.title) || sibling.year}</p>
                    <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">
                      {cleanSermonTitle(sibling)}
                    </h3>
                  </div>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/60 group-hover:bg-primary group-hover:text-dark">
                    <svg className="ml-0.5 h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
