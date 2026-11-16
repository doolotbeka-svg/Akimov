import React, { useState } from 'react';
import {
  CloudOff,
  Download,
  KeyRound,
  LogOut,
  Menu,
  Plus,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import { SyncStatus } from '../hooks/useSharedTree';

interface TopBarProps {
  canEdit: boolean;
  syncStatus: SyncStatus;
  onRequestLogin: () => void;
  onLogout: () => void;
  onOpenExportImport: (initialTab: 'export' | 'import') => void;
  onRequestReset: () => void;
  onAddNewMember: () => void;
}

const STATUS_LABELS: Record<SyncStatus, string> = {
  loading: 'Загрузка…',
  synced: 'Сохранено',
  saving: 'Сохранение…',
  offline: 'Нет связи',
  error: 'Не сохранено',
};

const SyncBadge: React.FC<{ status: SyncStatus; canEdit: boolean }> = ({ status, canEdit }) => {
  if (!canEdit && status !== 'offline') {
    return (
      <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full bg-[#F3EFE8] text-xs font-medium text-[#5E574E] whitespace-nowrap">
        Только просмотр
      </span>
    );
  }
  const warn = status === 'offline' || status === 'error';
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
        warn ? 'bg-[#F6EAE4] text-[#B85D3B]' : 'bg-[#E9EFEA] text-[#2D5A4C]'
      }`}
    >
      {warn && <CloudOff className="w-3.5 h-3.5" />}
      {STATUS_LABELS[status]}
    </span>
  );
};

export const TopBar: React.FC<TopBarProps> = ({
  canEdit,
  syncStatus,
  onRequestLogin,
  onLogout,
  onOpenExportImport,
  onRequestReset,
  onAddNewMember,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLink =
    'inline-flex items-center gap-1.5 hover:text-[#2D5A4C] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1';
  const mobileItem =
    'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-[#26221E] hover:bg-[#FAF8F5] text-left cursor-pointer';
  const closeMenuThen = (fn: () => void) => () => {
    setMobileMenuOpen(false);
    fn();
  };

  return (
    <header className="relative z-30 bg-[#FAF8F5]/95 backdrop-blur-sm border-b border-[#E6E0D5]">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand wordmark + sync state */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-display text-2xl font-semibold tracking-tight text-[#26221E] whitespace-nowrap shrink-0">
            Семейный альбом
          </span>
          <SyncBadge status={syncStatus} canEdit={canEdit} />
        </div>

        {/* Zone 2: Utility navigation (desktop) */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#5E574E]">
          <button type="button" onClick={() => onOpenExportImport('export')} className={navLink}>
            <Download className="w-4 h-4" />
            <span>Экспорт данных</span>
          </button>
          {canEdit && (
            <>
              <button type="button" onClick={() => onOpenExportImport('import')} className={navLink}>
                <Upload className="w-4 h-4" />
                <span>Импорт данных</span>
              </button>
              <button
                type="button"
                onClick={onRequestReset}
                className={`${navLink} hover:text-[#B85D3B]`}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Очистить и начать с нуля</span>
              </button>
              <button type="button" onClick={onLogout} className={navLink}>
                <LogOut className="w-4 h-4" />
                <span>Выйти</span>
              </button>
            </>
          )}
        </nav>

        {/* Zone 3: Primary CTA + mobile menu toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {canEdit ? (
            <button
              type="button"
              onClick={onAddNewMember}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2D5A4C] hover:bg-[#23473C] rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Добавить человека</span>
              <span className="sm:hidden">Добавить</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onRequestLogin}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#2D5A4C] bg-white border border-[#CEDBD4] hover:bg-[#E9EFEA] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px]"
            >
              <KeyRound className="w-4 h-4" />
              <span className="hidden sm:inline">Войти для правок</span>
              <span className="sm:hidden">Войти</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[#E6E0D5] bg-white text-[#26221E] hover:bg-[#F3EFE8] transition-colors cursor-pointer"
            aria-label={mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E6E0D5] bg-white px-4 py-3 space-y-1 shadow-sm">
          <button
            type="button"
            onClick={closeMenuThen(() => onOpenExportImport('export'))}
            className={mobileItem}
          >
            <Download className="w-4 h-4 text-[#2D5A4C]" />
            <span>Экспорт данных (JSON / CSV)</span>
          </button>
          {canEdit && (
            <>
              <button
                type="button"
                onClick={closeMenuThen(() => onOpenExportImport('import'))}
                className={mobileItem}
              >
                <Upload className="w-4 h-4 text-[#2D5A4C]" />
                <span>Импорт данных</span>
              </button>
              <button
                type="button"
                onClick={closeMenuThen(onRequestReset)}
                className={`${mobileItem} text-[#B85D3B] hover:bg-[#F6EAE4]/60`}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Очистить и начать с нуля</span>
              </button>
              <button type="button" onClick={closeMenuThen(onLogout)} className={mobileItem}>
                <LogOut className="w-4 h-4 text-[#5E574E]" />
                <span>Выйти из режима правок</span>
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
};
