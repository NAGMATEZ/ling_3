import React, { useState } from 'react';
import type { Session } from '../types.js';

export default function ShareLink({ session }: { session: Session | null }) {
  const [copied, setCopied] = useState(false);

  if (!session) return null;

  const shareUrl = `${window.location.origin}?session=${session.shareCode}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      prompt('Copy this link:', shareUrl);
    }
  };

  return (
    <div className="flex-row" style={{ gap: 6, alignItems: 'center' }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Share:</span>
      <input
        readOnly
        value={shareUrl}
        onClick={(e) => (e.target as HTMLInputElement).select()}
        style={{ flex: 1, minWidth: 120, fontSize: '0.8rem', cursor: 'pointer' }}
      />
      <button onClick={copyLink} style={{ background: 'var(--accent)', color: '#fff', fontSize: '0.8rem', padding: '6px 12px' }}>
        {copied ? '✓ Copied' : '📋 Copy'}
      </button>
    </div>
  );
}