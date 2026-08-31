/**
 * VoiceSoundboardPage.tsx
 * Full-page view for the community voice soundboard.
 */
import React from 'react';
import { VoiceSoundboard } from '../components/VoiceSoundboard';
import { useAuth } from '../context/AuthContext';

export const VoiceSoundboardPage: React.FC = () => {
  const { userCoords } = useAuth();
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <VoiceSoundboard userCoords={userCoords} />
    </div>
  );
};