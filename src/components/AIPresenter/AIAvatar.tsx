/**
 * AIAvatar — Lightweight animated presenter avatar.
 * Pure CSS/SVG animation — zero images, zero video, zero performance impact.
 * Blinks naturally, mouth moves when speaking, eyes follow attention.
 */
import React, { useEffect, useState } from 'react';

interface AIAvatarProps {
  isSpeaking: boolean;
  isListening: boolean;
  size?: number;
  minimized?: boolean;
}

export const AIAvatar: React.FC<AIAvatarProps> = ({
  isSpeaking,
  isListening,
  size = 64,
  minimized = false,
}) => {
  const [blink, setBlink] = useState(false);

  // Natural blink every 3-5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  if (minimized) {
    return (
      <div
        className="relative flex items-center justify-center rounded-full shadow-lg"
        style={{
          width: 40,
          height: 40,
          background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)',
        }}
      >
        {/* Simple dot that pulses when active */}
        <div
          className={`h-3 w-3 rounded-full ${isSpeaking || isListening ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: isSpeaking ? '#4CAF50' : isListening ? '#FF9800' : '#AED581' }}
        />
      </div>
    );
  }

  return (
    <div
      className="relative flex items-center justify-center rounded-full shadow-xl"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #4CAF50 100%)',
      }}
    >
      {/* Face container */}
      <svg viewBox="0 0 100 100" width={size * 0.7} height={size * 0.7}>
        {/* Eyes */}
        <ellipse cx="35" cy="40" rx="6" ry={blink ? 1 : 8} fill="#E8F5E9" style={{ transition: 'ry 0.1s' }} />
        <ellipse cx="65" cy="40" rx="6" ry={blink ? 1 : 8} fill="#E8F5E9" style={{ transition: 'ry 0.1s' }} />

        {/* Pupils */}
        {!blink && (
          <>
            <circle cx="35" cy="40" r="3" fill="#1B5E20" />
            <circle cx="65" cy="40" r="3" fill="#1B5E20" />
          </>
        )}

        {/* Mouth — animates when speaking */}
        <ellipse
          cx="50"
          cy="65"
          rx={isSpeaking ? 8 : 5}
          ry={isSpeaking ? 6 + Math.sin(Date.now() / 100) * 3 : 3}
          fill="#E8F5E9"
          style={{ transition: 'all 0.15s ease' }}
        />

        {/* Listening indicator */}
        {isListening && (
          <circle cx="50" cy="50" r="45" fill="none" stroke="#FF9800" strokeWidth="2" opacity={0.5}>
            <animate attributeName="r" from="40" to="48" dur="1s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.6" to="0" dur="1s" repeatCount="indefinite" />
          </circle>
        )}

        {/* Speaking indicator */}
        {isSpeaking && (
          <circle cx="50" cy="50" r="45" fill="none" stroke="#4CAF50" strokeWidth="2" opacity={0.5}>
            <animate attributeName="r" from="40" to="48" dur="0.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.6" to="0" dur="0.6s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>

      {/* Status dot */}
      <div
        className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white"
        style={{ backgroundColor: isSpeaking ? '#4CAF50' : isListening ? '#FF9800' : '#AED581' }}
      />
    </div>
  );
};

export default AIAvatar;
