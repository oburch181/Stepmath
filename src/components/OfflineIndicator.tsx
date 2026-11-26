import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 rounded-xl bg-walnut-soft border border-[#E5DAC8] px-3.5 py-2 text-xs font-medium text-walnut shadow-sm"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Offline — working from local cache</span>
    </div>
  );
};
