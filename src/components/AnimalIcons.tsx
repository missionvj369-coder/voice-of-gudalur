import React from 'react';

/**
 * Professional silhouette icons for the two residents of Gudalur's forests —
 * the elephant and the tiger. lucide-react ships no animal glyphs, so these
 * inline SVGs use the app's stroke/fill language and read clearly at any size.
 */

export const ElephantIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 64 48" fill="none" className={className} aria-hidden="true">
    {/* body */}
    <ellipse cx="41" cy="22" rx="17" ry="13" fill="currentColor" />
    {/* head */}
    <circle cx="23" cy="17" r="12" fill="currentColor" />
    {/* ear */}
    <ellipse cx="29" cy="15" rx="5.5" ry="9" fill="rgba(255,255,255,0.35)" />
    {/* trunk */}
    <path d="M12 24c-5 1-7.5 5-6.5 9.5.9-3.5 3-6 6-6L12 24Z" fill="currentColor" />
    {/* tusks */}
    <path d="M17 28c1 2 2.5 3 4.5 3.2" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" />
    {/* legs */}
    <rect x="30" y="33" width="5" height="12" rx="2.5" fill="currentColor" />
    <rect x="44" y="33" width="5" height="12" rx="2.5" fill="currentColor" />
    {/* tail */}
    <path d="M58 30c2 2 2 5 0 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const TigerIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 64 48" fill="none" className={className} aria-hidden="true">
    {/* face */}
    <circle cx="25" cy="18" r="14" fill="currentColor" />
    {/* ears */}
    <ellipse cx="13" cy="8" rx="5" ry="6" fill="currentColor" transform="rotate(-25 13 8)" />
    <ellipse cx="31" cy="6" rx="5" ry="6" fill="currentColor" transform="rotate(15 31 6)" />
    <ellipse cx="13" cy="8" rx="2" ry="3" fill="rgba(255,255,255,0.5)" transform="rotate(-25 13 8)" />
    <ellipse cx="31" cy="6" rx="2" ry="3" fill="rgba(255,255,255,0.5)" transform="rotate(15 31 6)" />
    {/* body */}
    <path d="M36 20c9 0 17 6 19 13 1 4-2 7-6 7h-8c-4 0-8-2-9-6l-2 6h-7v-6c-4-1-6-5-6-9h7c1 2 3 4 5 4 3 0 4-3 7-9Z" fill="currentColor" />
    {/* stripes */}
    <path d="M41 20l3-4M48 22l4-3.5M54 27l3-1M49 32l3 1M41 34l2-2" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" strokeLinecap="round" />
    {/* eyes + muzzle */}
    <circle cx="20" cy="15" r="1.7" fill="rgba(255,255,255,0.95)" />
    <circle cx="29" cy="15" r="1.7" fill="rgba(255,255,255,0.95)" />
    <path d="M21 22c2 1.5 5 1.5 7 0" stroke="rgba(255,255,255,0.7)" strokeWidth="1.6" strokeLinecap="round" />
    {/* tail */}
    <path d="M58 34c4 1 6 4 4 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);