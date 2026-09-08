/**
 * PlatformIcon — renders the official brand SVG icon for each social platform.
 * Icons are served as static SVG files from /public/icons/ and already
 * embed each platform's official brand color in their fill attributes.
 */

import React from 'react';

export type PlatformName =
  | 'instagram'
  | 'facebook'
  | 'whatsapp'
  | 'snapchat'
  | 'sharechat'
  | 'telegram'
  | 'twitter';

export interface PlatformConfig {
  name: PlatformName;
  label: string;
  color: string;
  appScheme?: string;
}

export const PLATFORMS: Record<PlatformName, PlatformConfig> = {
  whatsapp: { name: 'whatsapp', label: 'WhatsApp', color: '25D366', appScheme: 'whatsapp://send' },
  instagram: { name: 'instagram', label: 'Instagram', color: 'E4405F', appScheme: 'instagram://library' },
  facebook: { name: 'facebook', label: 'Facebook', color: '1877F2', appScheme: 'fb://' },
  telegram: { name: 'telegram', label: 'Telegram', color: '26A5E4', appScheme: 'tg://resolve' },
  twitter: { name: 'twitter', label: 'X (Twitter)', color: '111111', appScheme: 'twitter://post' },
  snapchat: { name: 'snapchat', label: 'Snapchat', color: 'FFFC00', appScheme: 'snapchat://' },
  sharechat: { name: 'sharechat', label: 'ShareChat', color: 'fc4f32', appScheme: 'sharechat://' },
};

/**
 * Renders the platform's official brand SVG icon.
 * The SVG files in /public/icons/ already contain the correct brand colors.
 *
 * @param platform - the platform name (determines which SVG to render)
 * @param size - pixel size of the rendered icon (default 24)
 * @param alt - accessibility label (defaults to platform label)
 * @param className - optional additional CSS classes
 */
export const PlatformIcon: React.FC<{
  platform: PlatformName;
  size?: number;
  alt?: string;
  className?: string;
}> = ({ platform, size = 24, alt, className = '' }) => {
  const config = PLATFORMS[platform];
  return (
    <img
      src={`/icons/${platform}.svg`}
      alt={alt ?? config.label}
      className={`shrink-0 ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
      loading="lazy"
      decoding="async"
    />
  );
};

export default PlatformIcon;