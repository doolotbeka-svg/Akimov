import React, { useState } from 'react';
import { Download, Menu, Plus, RotateCcw, Upload, X } from 'lucide-react';

interface TopBarProps {
  onOpenExportImport: (initialTab: 'export' | 'import') => void;
  onRequestReset: () => void;
  onAddNewMember: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenExportImport,
  onRequestReset,
  onAddNewMember,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="relative z-30 bg-[#FAF8F5]/95 backdrop-blur-sm border-b border-[#E6E0D5]">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand wordmark */}
        <a
          href="#top"
          onClick={(e) => e.preventDefault()}
          className="font-display text-2xl font-semibold tracking-tight text-[#26221E] whitespace-nowrap shrink-0"
        >
          Семейный альбом
        </a>

        {/* Zone 2: Clean single-line utility navigation links (desktop) */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5E574E]">
          <button
            type="button"
            onClick={() => onOpenExportImport('export')}
            className="inline-flex items-center gap-1.5 hover:text-[#2D5A4C] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
          >
            <Download className="w-4 h-4" />
            <span>Экспорт данных</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenExportImport('import')}
            className="inline-flex items-center gap-1.5 hover:text-[#2D5A4C] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
          >
            <Upload className="w-4 h-4" />
            <span>Импорт данных</span>
          </button>
          <button
            type="button"
            onClick={onRequestReset}
            className="inline-flex items-center gap-1.5 hover:text-[#B85D3B] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Очистить и начать с нуля</span>
          </button>
        </nav>

        {/* Zone 3: Single primary CTA + mobile menu toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onAddNewMember}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2D5A4C] hover:bg-[#23473C] rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Добавить человека</span>
            <span className="sm:hidden">Добавить</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[#E6E0D5] bg-white text-[#26221E] hover:bg-[#F3EFE8] transition-colors cursor-pointer"
            aria-label={mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E6E0D5] bg-white px-4 py-3 space-y-1 shadow-sm">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenExportImport('export');
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-[#26221E] hover:bg-[#FAF8F5] text-left cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#2D5A4C]" />
            <span>Экспорт данных (JSON / CSV)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenExportImport('import');
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-[#26221E] hover:bg-[#FAF8F5] text-left cursor-pointer"
          >
            <Upload className="w-4 h-4 text-[#2D5A4C]" />
            <span>Импорт данных</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onRequestReset();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-[#B85D3B] hover:bg-[#F6EAE4]/60 text-left cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Очистить и начать с нуля</span>
          </button>
        </div>
      )}
    </header>
  );
};
