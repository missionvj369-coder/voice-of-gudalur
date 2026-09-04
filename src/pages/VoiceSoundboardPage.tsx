/**
 * VoiceSoundboardPage.tsx
 * Full-page view for Rise Voice - community voice platform.
 */
import React from 'react';
import { RiseVoice } from '../components/RiseVoice';
import { useAuth } from '../context/AuthContext';

export const VoiceSoundboardPage: React.FC = () => {
  const { userCoords } = useAuth();
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <RiseVoice userCoords={userCoords} />
    </div>
  );
};