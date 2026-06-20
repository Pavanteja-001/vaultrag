import React from 'react';
import { Lock, Unlock } from 'lucide-react';

const HashChainIndicator = ({ hashValid }) => {
  if (hashValid === undefined || hashValid === null) return null;

  return (
    <div
      className="relative group inline-flex"
      title={hashValid ? 'Hash chain intact' : '⚠ HASH MISMATCH — possible tampering detected'}
    >
      {hashValid ? (
        <Lock className="w-3.5 h-3.5 text-neon-green" />
      ) : (
        <Unlock
          className="w-3.5 h-3.5 text-neon-red animate-pulse"
          style={{ filter: 'drop-shadow(0 0 4px rgba(255,0,60,0.6))' }}
        />
      )}

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50">
        <div className={`glass-card px-2.5 py-1.5 text-xs whitespace-nowrap font-mono-code ${
          hashValid ? 'text-neon-green border-neon-green/20' : 'text-neon-red border-neon-red/30'
        }`}>
          {hashValid ? '✓ Chain intact' : '⚠ TAMPERING DETECTED'}
        </div>
      </div>
    </div>
  );
};

export default HashChainIndicator;
