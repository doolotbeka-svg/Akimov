import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmClear: () => void;
}

export const ConfirmResetModal: React.FC<ConfirmResetModalProps> = ({
  isOpen,
  onClose,
  onConfirmClear,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#26221E]/35 backdrop-blur-[2px]"
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md bg-white border border-[#E6E0D5] rounded-2xl shadow-xl p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="w-11 h-11 rounded-full bg-[#F6EAE4] text-[#B85D3B] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#5E574E] hover:bg-[#F3EFE8] cursor-pointer"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h2 className="font-display text-2xl font-semibold text-[#26221E] mb-2">
          Очистить древо и начать с нуля?
        </h2>
        <p className="text-sm text-[#5E574E] leading-relaxed mb-6">
          Все текущие карточки и фотографии будут удалены с этого холста. Если вы хотите сохранить копию, сначала воспользуйтесь кнопкой «Экспорт данных».
        </p>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[#E6E0D5] bg-[#FAF8F5] hover:bg-[#F3EFE8] text-sm font-medium text-[#26221E] cursor-pointer"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmClear();
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-[#B85D3B] hover:bg-[#9A4A2D] text-white text-sm font-medium cursor-pointer"
          >
            Очистить и начать с нуля
          </button>
        </div>
      </div>
    </div>
  );
};
