/**
 * PlatformIcon — renders the official brand SVG icon for each social platform.
 * Uses react-icons/si (Simple Icons) for official brand icons.
 */

import React from 'react';
import {
  SiWhatsapp,
  SiInstagram,
  SiFacebook,
  SiTelegram,
  SiX,
  SiSnapchat,
} from 'react-icons/si';

// Custom ShareChat icon (not available in Simple Icons)
const SiSharechat: React.FC<{ size?: number; className?: string; title?: string; 'aria-label'?: string }> = ({ size = 24, className, title, 'aria-label': ariaLabel }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="#fc4f32"
    role="img"
    aria-label={ariaLabel}
  >
    {title && <title>{title}</title>}
    <path d="M17.2 14.6a2.1 2.1 0 0 0-1.18.36l-3.34-1.94a2.62 2.62 0 0 0 0-1.06l3.3-1.92a2.15 2.15 0 1 0-.99-1.72 2.2 2.2 0 0 0 .04.4l-3.3 1.93a2.13 2.13 0 1 0 0 3.7l3.34 1.94a2.1 2.1 0 1 0 1.13-1.69Z" />
  </svg>
);

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

const ICON_MAP: Record<PlatformName, React.FC<{ size?: number; className?: string; title?: string; 'aria-label'?: string }>> = {
  whatsapp: SiWhatsapp,
  instagram: SiInstagram,
  facebook: SiFacebook,
  telegram: SiTelegram,
  twitter: SiX,
  snapchat: SiSnapchat,
  sharechat: SiSharechat,
};

/**
 * Renders the platform's official brand SVG icon.
 *
 * @param platform - the platform name (determines which icon to render)
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
  const IconComponent = ICON_MAP[platform];
  return (
    <IconComponent
      size={size}
      className={className}
      title={alt ?? config.label}
      aria-label={alt ?? config.label}
    />
  );
};

export default PlatformIcon;