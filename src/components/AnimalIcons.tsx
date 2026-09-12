import React from 'react';

/**
 * Voice of Gudalur — realistic silhouette icons for the two wild residents of
 * Gudalur's forests (the Asian elephant and the Bengal tiger) and the citizen
 * who stands peacefully between them. lucide-react ships no animal glyphs, so
 * these inline SVGs carry the app's stroke/fill language while reading clearly
 * at any size.
 */

export const ElephantIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg width={size} height={size * 0.6667} viewBox="0 0 72 48" fill="none" className={className} aria-hidden="true">
    {/* far legs (slightly darker) */}
    <rect x="18" y="32" width="6" height="13" rx="3" fill="currentColor" opacity="0.8" />
    <rect x="37" y="32" width="6" height="13" rx="3" fill="currentColor" opacity="0.8" />
    {/* body — domed back sloping to the rump */}
    <path d="M12 20 C15 14 20 8 32 5 44 5 49 9 52 13 54 18 54 25 51 31 46 34 40 34 32 34 26 34 22 33 18 31 16 29 14 28 13 29 12 31 12 33 Z" fill="currentColor" />
    {/* head */}
    <circle cx="51" cy="16" r="12" fill="currentColor" />
    {/* ear — large fan flap of the Asian elephant */}
    <path d="M47 10 C42 6 38 9 36 13 36 17 38 21 43 24 47 24 51 20 52 15 52 10 50 8 Z" fill="rgba(255,255,255,0.32)" />
    {/* trunk — hanging with a gentle curl */}
    <path d="M49 26 C51 31 54 36 56 41 58 44 56 45 53 43 50 39 47 34 47 29 Z" fill="currentColor" />
    {/* tusk */}
    <path d="M49 30 C52 33 55 36 57 39" stroke="rgba(255,255,255,0.92)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    {/* eye */}
    <circle cx="56" cy="14" r="1.5" fill="rgba(255,255,255,0.9)" />
    {/* near legs */}
    <rect x="22" y="33" width="8" height="14" rx="3.5" fill="currentColor" />
    <rect x="41" y="33" width="8" height="14" rx="3.5" fill="currentColor" />
    {/* tail with tuft */}
    <path d="M12 20 C10 21 9 24 9 27 10 29" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    <circle cx="9.8" cy="30" r="1.6" fill="currentColor" />
  </svg>
);

export const TigerIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg width={size} height={size * 0.6667} viewBox="0 0 72 48" fill="none" className={className} aria-hidden="true">
    {/* far legs (slightly darker) */}
    <path d="M23 34 L23 42 L29 42 L29 37 Z" fill="currentColor" opacity="0.78" />
    <path d="M49 34 L49 41 L55 41 L55 37 Z" fill="currentColor" opacity="0.78" />
    {/* body — low, crouched walking profile */}
    <path d="M16 22 C24 16 33 13 43 12 53 14 59 19 62 25 61 31 56 35 47 36 37 35 29 32 25 30 20 29 17 28 15 25 Z" fill="currentColor" />
    {/* near legs */}
    <path d="M27 30 L27 42 L33 42 L33 34 Z" fill="currentColor" />
    <path d="M45 30 L46 41 L53 41 L53 33 Z" fill="currentColor" />
    {/* head */}
    <circle cx="19" cy="16" r="11" fill="currentColor" />
    {/* jaw / muzzle mass */}
    <ellipse cx="15" cy="22" rx="8" ry="4.5" fill="currentColor" />
    {/* ears */}
    <path d="M11 7 C12 4 15 3 17 6 Z" fill="currentColor" />
    <path d="M21 5 C22 2 25 3 26 7 Z" fill="currentColor" />
    {/* body stripes */}
    <path d="M33 15 L33 29 M41 13 L41 29 M49 14 L49 30 M57 16 L57 30" stroke="rgba(255,255,255,0.5)" strokeWidth="2.6" strokeLinecap="round" />
    {/* forehead stripes */}
    <path d="M15 9 L15 13 M21 9 L21 13" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round" />
    {/* eye */}
    <circle cx="15" cy="13" r="1.6" fill="rgba(255,255,255,0.95)" />
    {/* muzzle */}
    <path d="M10 19 C11 21 13 23 15 22" stroke="rgba(255,255,255,0.7)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    {/* chest line */}
    <path d="M11 24 C12 26 14 27 16 26" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    {/* tail — raised and curling */}
    <path d="M61 16 C64 11 67 7 66 3 62 2" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    <circle cx="63" cy="2.5" r="2.2" fill="currentColor" />
  </svg>
);

/**
 * Human figure — a citizen standing upright for safety, in calm coexistence
 * with the forest's wildlife. Simple dignified silhouette.
 */
export const HumanIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg width={size * 0.7} height={size} viewBox="0 0 32 46" fill="none" className={className} aria-hidden="true">
    {/* head */}
    <circle cx="16" cy="7" r="5.6" fill="currentColor" />
    {/* neck */}
    <rect x="14.6" y="12" width="2.8" height="3" rx="1.4" fill="currentColor" />
    {/* torso — kurta silhouette with rounded shoulders */}
    <path d="M12.6 15 C14 13.7 16 13 18 13.7 19.4 15 L20 22 C21 25.4 19.6 27.4 17 28 14 28.2 12.4 27.4 11.8 25 11.8 19 11.9 17 12.3 15.6 12.6 15 Z" fill="currentColor" />
    {/* arms resting at the sides */}
    <path d="M12.4 15.6 C11.3 17.8 10.5 20.6 10.7 23 11 25.6 11.6 27.4" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    <path d="M19.6 15.6 C20.7 17.8 21.5 20.6 21.3 23 21 25.6 20.4 27.4" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    {/* legs */}
    <path d="M14.2 28.2 C14 32 14.4 35.6 15.1 39.2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
    <path d="M17.8 28.2 C18 32 17.6 35.6 16.9 39.2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
    {/* feet */}
    <path d="M14.9 39.4 L13 41" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    <path d="M17.1 39.4 L19 41" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none" />
  </svg>
);