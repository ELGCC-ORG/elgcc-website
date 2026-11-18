'use client';

import { useState } from 'react';
import { cleanSeriesTitle, splitCoverTitle, DEFAULT_SPEAKER } from '@/lib/teachings';

interface SeriesArtworkProps {
  seriesTitle: string;
  year: number;
  speaker?: string;
  categoryLabel?: string;
  thumbnail?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

interface CoverPalette {
  background: string;
  orbOne: string;
  orbTwo: string;
  accentWave?: string;
  textColor: string;
  subColor: string;
  stampColor: string;
  speakerColor: string;
  darkBackdrop: boolean;
}

const STUDIO_PALETTES: CoverPalette[] = [
  // 1. Lavender Mist (like "What God is Building")
  {
    background: 'linear-gradient(155deg, #ECE8F8 0%, #F7F5FC 48%, #BEB3E4 100%)',
    orbOne: 'radial-gradient(circle at 12% 10%, rgba(110, 96, 178, 0.34), transparent 54%)',
    orbTwo: 'radial-gradient(circle at 86% 90%, rgba(72, 55, 148, 0.56), transparent 60%)',
    textColor: '#191454',
    subColor: 'rgba(25, 20, 84, 0.72)',
    stampColor: 'rgba(25, 20, 84, 0.78)',
    speakerColor: 'rgba(25, 20, 84, 0.78)',
    darkBackdrop: false,
  },
  // 2. Deep Umber Gold (like "The Fullness of God")
  {
    background: 'linear-gradient(145deg, #1E130B 0%, #3E2210 52%, #190D06 100%)',
    orbOne: 'radial-gradient(circle at 22% 18%, rgba(196, 118, 42, 0.52), transparent 56%)',
    orbTwo: 'radial-gradient(circle at 82% 84%, rgba(145, 76, 22, 0.45), transparent 58%)',
    textColor: '#FBF4E9',
    subColor: 'rgba(251, 244, 233, 0.74)',
    stampColor: 'rgba(251, 244, 233, 0.65)',
    speakerColor: 'rgba(251, 244, 233, 0.78)',
    darkBackdrop: true,
  },
  // 3. Seafoam Sage (like "What is the Spirit Saying")
  {
    background: 'linear-gradient(140deg, #BBE4D4 0%, #92CDB8 48%, #5FB199 100%)',
    orbOne: 'radial-gradient(circle at 75% 20%, rgba(236, 250, 244, 0.68), transparent 55%)',
    orbTwo: 'radial-gradient(circle at 18% 85%, rgba(35, 112, 88, 0.36), transparent 55%)',
    textColor: '#0E3828',
    subColor: 'rgba(14, 56, 40, 0.75)',
    stampColor: 'rgba(14, 56, 40, 0.72)',
    speakerColor: 'rgba(14, 56, 40, 0.80)',
    darkBackdrop: false,
  },
  // 4. Ivory Slate (like "Baptism with the Holy Ghost")
  {
    background: 'linear-gradient(155deg, #F7F7F2 0%, #EEF1F4 52%, #CBD5DF 100%)',
    orbOne: 'radial-gradient(circle at 82% 18%, rgba(112, 146, 175, 0.34), transparent 52%)',
    orbTwo: 'radial-gradient(circle at 12% 82%, rgba(162, 178, 194, 0.32), transparent 55%)',
    textColor: '#1F2933',
    subColor: 'rgba(31, 41, 51, 0.68)',
    stampColor: 'rgba(31, 41, 51, 0.66)',
    speakerColor: 'rgba(31, 41, 51, 0.75)',
    darkBackdrop: false,
  },
  // 5. Rose & Sage Prism (like "Two Kinds of Righteousness")
  {
    background: 'linear-gradient(135deg, #D2F4DD 0%, #F9FAFB 48%, #F8BBD0 100%)',
    orbOne: 'radial-gradient(circle at 18% 18%, rgba(92, 198, 134, 0.45), transparent 55%)',
    orbTwo: 'radial-gradient(circle at 88% 82%, rgba(236, 72, 135, 0.50), transparent 55%)',
    textColor: '#163A28',
    subColor: 'rgba(22, 58, 40, 0.75)',
    stampColor: 'rgba(22, 58, 40, 0.72)',
    speakerColor: 'rgba(22, 58, 40, 0.80)',
    darkBackdrop: false,
  },
  // 6. Burnt Copper (like "The Fullness of God - Amber")
  {
    background: 'linear-gradient(150deg, #4B1F06 0%, #A84A0C 52%, #240D02 100%)',
    orbOne: 'radial-gradient(circle at 50% 44%, rgba(247, 158, 56, 0.56), transparent 62%)',
    orbTwo: 'radial-gradient(circle at 85% 15%, rgba(255, 200, 120, 0.28), transparent 48%)',
    textColor: '#FFF7EE',
    subColor: 'rgba(255, 247, 238, 0.78)',
    stampColor: 'rgba(255, 247, 238, 0.68)',
    speakerColor: 'rgba(255, 247, 238, 0.82)',
    darkBackdrop: true,
  },
  // 7. Sky & Pearl (like "Baptism Sky")
  {
    background: 'linear-gradient(150deg, #EAF6FF 0%, #FFFFFF 52%, #BCE0FF 100%)',
    orbOne: 'radial-gradient(circle at 88% 16%, rgba(84, 178, 255, 0.48), transparent 52%)',
    orbTwo: 'radial-gradient(circle at 10% 88%, rgba(114, 196, 255, 0.42), transparent 52%)',
    textColor: '#152A47',
    subColor: 'rgba(21, 42, 71, 0.72)',
    stampColor: 'rgba(21, 42, 71, 0.68)',
    speakerColor: 'rgba(21, 42, 71, 0.78)',
    darkBackdrop: false,
  },
  // 8. Emerald Glass (like "Spiritual Appetite")
  {
    background: 'linear-gradient(145deg, #9AD4C2 0%, #7CC1AC 54%, #4D9884 100%)',
    orbOne: 'radial-gradient(circle at 20% 25%, rgba(255, 255, 255, 0.42), transparent 54%)',
    orbTwo: 'radial-gradient(circle at 84% 78%, rgba(20, 88, 72, 0.40), transparent 58%)',
    textColor: '#0E332B',
    subColor: 'rgba(14, 51, 43, 0.76)',
    stampColor: 'rgba(14, 51, 43, 0.70)',
    speakerColor: 'rgba(14, 51, 43, 0.80)',
    darkBackdrop: false,
  },
  // 9. Royal Cobalt & Ochre (like "Why Jesus Rejoiced")
  {
    background: 'linear-gradient(160deg, #1E49B8 0%, #2B62DE 58%, #153488 100%)',
    orbOne: 'radial-gradient(circle at 20% 20%, rgba(120, 175, 255, 0.35), transparent 55%)',
    orbTwo: 'radial-gradient(circle at 72% 100%, rgba(235, 210, 56, 0.65), transparent 52%)',
    textColor: '#FDE85C',
    subColor: 'rgba(255, 255, 255, 0.88)',
    stampColor: 'rgba(255, 255, 255, 0.72)',
    speakerColor: 'rgba(255, 255, 255, 0.86)',
    darkBackdrop: true,
  },
  // 10. Twilight Bronze (like "Experimenting the Things of the Spirit")
  {
    background: 'linear-gradient(145deg, #4B2B1E 0%, #6D5A52 52%, #47525E 100%)',
    orbOne: 'radial-gradient(circle at 18% 72%, rgba(206, 98, 52, 0.56), transparent 56%)',
    orbTwo: 'radial-gradient(circle at 86% 24%, rgba(176, 190, 206, 0.32), transparent 56%)',
    textColor: '#FAF5EF',
    subColor: 'rgba(250, 245, 239, 0.78)',
    stampColor: 'rgba(250, 245, 239, 0.68)',
    speakerColor: 'rgba(250, 245, 239, 0.80)',
    darkBackdrop: true,
  },
  // 11. ELGCC Olive Cream (brand signature cream + olive)
  {
    background: 'linear-gradient(150deg, #F5F1E8 0%, #EFEADF 52%, #D4DEC2 100%)',
    orbOne: 'radial-gradient(circle at 85% 15%, rgba(107, 127, 76, 0.34), transparent 55%)',
    orbTwo: 'radial-gradient(circle at 15% 88%, rgba(139, 115, 85, 0.28), transparent 55%)',
    textColor: '#252E18',
    subColor: 'rgba(37, 46, 24, 0.74)',
    stampColor: 'rgba(107, 127, 76, 0.90)',
    speakerColor: 'rgba(37, 46, 24, 0.78)',
    darkBackdrop: false,
  },
  // 12. Midnight Champagne
  {
    background: 'linear-gradient(145deg, #161B22 0%, #242C37 54%, #13161B 100%)',
    orbOne: 'radial-gradient(circle at 78% 22%, rgba(138, 157, 111, 0.38), transparent 56%)',
    orbTwo: 'radial-gradient(circle at 22% 84%, rgba(212, 180, 120, 0.26), transparent 54%)',
    textColor: '#F6F3EB',
    subColor: 'rgba(246, 243, 235, 0.74)',
    stampColor: 'rgba(162, 184, 125, 0.88)',
    speakerColor: 'rgba(246, 243, 235, 0.76)',
    darkBackdrop: true,
  },
];

function hashKey(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export default function SeriesArtwork({
  seriesTitle,
  year,
  speaker,
  categoryLabel,
  thumbnail,
  size = 'md',
  className = '',
}: SeriesArtworkProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const resolvedSpeaker = speaker === undefined ? DEFAULT_SPEAKER : speaker.trim();

  const cleanTitle = cleanSeriesTitle(seriesTitle, year);
  const { main, sub } = splitCoverTitle(cleanTitle);
  const palette = STUDIO_PALETTES[hashKey(`${cleanTitle}::${year}`) % STUDIO_PALETTES.length];

  if (thumbnail && !imgFailed) {
    return (
      <div className={`relative aspect-square w-full overflow-hidden select-none ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnail}
          alt={cleanTitle}
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  // Monogram initials for tiny player artwork (xs)
  if (size === 'xs') {
    const initials = main
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('');

    return (
      <div
        className={`relative aspect-square w-full overflow-hidden flex items-center justify-center select-none ${className}`}
        style={{ background: palette.background }}
      >
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: `${palette.orbOne}, ${palette.orbTwo}` }} />
        <span
          className="relative z-10 font-serifCover text-sm font-bold tracking-tight"
          style={{ color: palette.textColor }}
        >
          {initials || 'EL'}
        </span>
      </div>
    );
  }

  // Dynamic font sizing so short titles pop and long titles never clip
  const len = main.length;
  let headingClass = '';
  if (size === 'lg') {
    headingClass =
      len <= 18
        ? 'text-3xl sm:text-4xl'
        : len <= 32
          ? 'text-2xl sm:text-3xl'
          : len <= 52
            ? 'text-xl sm:text-2xl'
            : 'text-lg sm:text-xl';
  } else if (size === 'sm') {
    headingClass = len <= 22 ? 'text-xs' : 'text-[10px]';
  } else {
    // md: 2-col mobile up to 5-col desktop
    headingClass =
      len <= 18
        ? 'text-[17px] sm:text-xl xl:text-[22px]'
        : len <= 30
          ? 'text-[15px] sm:text-[17px] xl:text-[19px]'
          : len <= 46
            ? 'text-[13px] sm:text-[15px] xl:text-base'
            : 'text-[11px] sm:text-xs xl:text-[13px]';
  }

  const stampText = categoryLabel ? `${categoryLabel} · ${year}` : `ELGCC · ${year}`;

  return (
    <div
      className={`relative aspect-square w-full overflow-hidden select-none flex flex-col justify-between ${
        size === 'lg' ? 'p-4 sm:p-5' : size === 'sm' ? 'p-2' : 'p-3 sm:p-3.5'
      } ${className}`}
      style={{ background: palette.background }}
    >
      {/* Layered Atmospheric Color Orbs */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: `${palette.orbOne}, ${palette.orbTwo}` }}
      />

      {/* Subtle Curvilinear Print Accent */}
      <div
        className="pointer-events-none absolute -right-1/4 -top-1/4 h-[115%] w-[115%] rounded-full border opacity-20"
        style={{ borderColor: palette.textColor }}
      />

      {/* Tactile Editorial Paper Grain Overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Top-left Micro Stamp */}
      <div className="relative z-10 flex items-center justify-between">
        {size !== 'sm' && (
          <span
            className={`font-serifCover font-bold tracking-tight leading-none ${
              size === 'lg' ? 'text-[10px] sm:text-[11px]' : 'text-[8px] sm:text-[9px]'
            }`}
            style={{ color: palette.stampColor }}
          >
            {stampText}
          </span>
        )}
      </div>

      {/* Center Editorial Typography */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center px-1 text-center">
        <h3
          className={`font-serifCover font-bold tracking-tight leading-[1.06] text-balance line-clamp-4 ${headingClass}`}
          style={{ color: palette.textColor }}
        >
          {main}
        </h3>
        {sub && size !== 'sm' && (
          <p
            className={`mt-1.5 font-sans font-semibold uppercase tracking-[0.14em] line-clamp-2 max-w-[92%] ${
              size === 'lg' ? 'text-[9px] sm:text-[10px]' : 'text-[7px] sm:text-[8px]'
            }`}
            style={{ color: palette.subColor }}
          >
            {sub}
          </p>
        )}
      </div>

      {/* Bottom Speaker Credit (omitted when speaker is empty, e.g. multi-speaker series) */}
      <div className="relative z-10 flex items-end justify-center min-h-[12px]">
        {size !== 'sm' && resolvedSpeaker && (
          <p
            className={`font-serifCover font-semibold tracking-wide truncate max-w-full ${
              size === 'lg' ? 'text-[10px] sm:text-xs' : 'text-[8px] sm:text-[9px]'
            }`}
            style={{ color: palette.speakerColor }}
          >
            {resolvedSpeaker}
          </p>
        )}
      </div>
    </div>
  );
}
