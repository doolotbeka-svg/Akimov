import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface SyncNoticeProps {
  message: string;
  onClose: () => void;
}

export const SyncNotice: React.FC<SyncNoticeProps> = ({ message, onClose }) => (
  <div
    role="status"
    className="relative z-20 bg-[#F6EAE4] border-b border-[#E8CFC4] text-[#7A3B24]"
  >
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2 flex items-start gap-2.5 text-sm">
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
      <p className="flex-1">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 p-0.5 rounded hover:bg-[#E8CFC4]/60 cursor-pointer"
        aria-label="Скрыть уведомление"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
);
