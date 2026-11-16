import React, { useRef, useState } from 'react';
import { CheckCircle2, Download, FileJson, FileSpreadsheet, Upload, X } from 'lucide-react';
import { FamilyTreeData } from '../types/family';
import {
  exportTreeAsCsv,
  exportTreeAsJson,
  parseImportedCsv,
  parseImportedJson,
} from '../utils/exportImport';

interface ExportImportModalProps {
  isOpen: boolean;
  initialTab: 'export' | 'import';
  canImport: boolean;
  treeData: FamilyTreeData;
  onClose: () => void;
  onImportTree: (imported: FamilyTreeData) => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  initialTab,
  canImport,
  treeData,
  onClose,
  onImportTree,
}) => {
  const [tab, setTab] = useState<'export' | 'import'>(initialTab);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const memberCount = Object.keys(treeData.members).length;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const text = await file.text();
      const lower = file.name.toLowerCase();
      const parsed = lower.endsWith('.csv') ? parseImportedCsv(text) : parseImportedJson(text);
      onImportTree(parsed);
      setSuccessMsg(
        `Успешно загружено: ${Object.keys(parsed.members).length} записей из «${file.name}».`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Не удалось прочитать файл. Проверьте формат JSON или CSV.'
      );
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#26221E]/35 backdrop-blur-[2px]"
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-lg bg-[#FAF8F5] border border-[#E6E0D5] rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-white px-6 py-4 border-b border-[#E6E0D5] flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-[#26221E]">
            Резервная копия и перенос данных
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#5E574E] hover:bg-[#F3EFE8] cursor-pointer"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div
            className={`${canImport ? 'inline-flex' : 'hidden'} w-full p-1 bg-[#F3EFE8] rounded-lg border border-[#E6E0D5]`}
          >
            <button
              type="button"
              onClick={() => {
                setTab('export');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                tab === 'export' ? 'bg-white text-[#2D5A4C] shadow-xs' : 'text-[#5E574E]'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Экспорт данных</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('import');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                tab === 'import' ? 'bg-white text-[#2D5A4C] shadow-xs' : 'text-[#5E574E]'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Импорт данных</span>
            </button>
          </div>

          {tab === 'export' || !canImport ? (
            <div className="space-y-3">
              <p className="text-sm text-[#5E574E] leading-relaxed">
                Древо хранится на сервере и доступно всем родным по ссылке. Чтобы сделать архив на компьютере или передать альбом близким, скачайте файл:
              </p>

              <button
                type="button"
                disabled={memberCount === 0}
                onClick={() => {
                  exportTreeAsJson(treeData);
                  setSuccessMsg('Файл JSON успешно скачан.');
                }}
                className="w-full bg-white border border-[#E6E0D5] hover:border-[#2D5A4C] rounded-xl p-4 flex items-start gap-3.5 text-left transition-colors cursor-pointer disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-lg bg-[#E9EFEA] text-[#2D5A4C] flex items-center justify-center shrink-0">
                  <FileJson className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[#26221E]">
                    Полный архив в JSON (рекомендуется)
                  </div>
                  <div className="text-xs text-[#5E574E] mt-0.5 leading-relaxed">
                    Сохраняет всех людей, родственные связи, биографии, загруженные портреты и галерею документов.
                  </div>
                </div>
              </button>

              <button
                type="button"
                disabled={memberCount === 0}
                onClick={() => {
                  exportTreeAsCsv(treeData);
                  setSuccessMsg('Таблица CSV успешно скачана.');
                }}
                className="w-full bg-white border border-[#E6E0D5] hover:border-[#2D5A4C] rounded-xl p-4 flex items-start gap-3.5 text-left transition-colors cursor-pointer disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-lg bg-[#F6EAE4] text-[#B85D3B] flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[#26221E]">
                    Таблица в CSV (для Excel и Google Таблиц)
                  </div>
                  <div className="text-xs text-[#5E574E] mt-0.5 leading-relaxed">
                    Удобный табличный список всех членов семьи в кодировке UTF-8 с сохранением связей.
                  </div>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-[#5E574E] leading-relaxed">
                Выберите ранее сохранённый файл формата <strong>.json</strong> или <strong>.csv</strong>. Общее древо будет заменено данными из файла — для всех, кто его смотрит.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,application/json,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-[#D6CEBE] hover:border-[#2D5A4C] bg-white rounded-xl py-8 px-4 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Upload className="w-7 h-7 text-[#2D5A4C]" />
                <span className="text-sm font-medium text-[#26221E]">
                  Нажмите, чтобы выбрать файл JSON или CSV
                </span>
                <span className="text-xs text-[#8A8175]">
                  Поддерживается восстановление полных архивов и таблиц
                </span>
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="px-4 py-3 rounded-xl bg-[#F6EAE4] border border-[#E2BFB1] text-xs text-[#9A3412]">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="px-4 py-3 rounded-xl bg-[#E9EFEA] border border-[#CEDBD4] text-xs text-[#2D5A4C] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
