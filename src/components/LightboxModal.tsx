import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { GalleryItem } from '../types/family';

interface LightboxModalProps {
  item: GalleryItem | null;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({ item, onClose }) => {
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 sm:p-8 bg-[#1C1917]/85 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
        aria-label="Закрыть просмотр"
      >
        <X className="w-5 h-5" />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="max-w-4xl w-full flex flex-col items-center"
      >
        <img
          src={item.dataUrl}
          alt={item.title}
          referrerPolicy="no-referrer"
          className="max-h-[78vh] w-auto rounded-xl shadow-2xl border border-white/15 object-contain bg-white"
        />
        <div className="mt-4 text-center text-white">
          <div className="font-display text-2xl font-medium">{item.title}</div>
          {item.date && <div className="text-sm text-white/75 mt-1 tabular-nums">{item.date}</div>}
        </div>
      </div>
    </div>
  );
};
