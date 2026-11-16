import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { CARD_HEIGHT, CARD_WIDTH, TreeLayoutResult } from '../utils/treeLayout';
import { formatLifespan, MONTHS_GENITIVE } from '../utils/dateUtils';
import { GenderAvatar } from './GenderAvatar';

type Paper = 'A4' | 'A3';

/** Landscape sheet sizes in CSS pixels (96 dpi), a hair under the real size to avoid a blank 2nd page. */
const PAPER: Record<Paper, { w: number; h: number; label: string }> = {
  A4: { w: 1122, h: 793, label: 'A4 — обычный лист' },
  A3: { w: 1587, h: 1122, label: 'A3 — плакат' },
};

const SHEET_PADDING = 44;
const HEADER_H = 96;
const FOOTER_H = 28;
const LABEL_W = 150; // generation labels to the left of the tree
const ARC_ROOM = CARD_HEIGHT / 2 + 30; // dashed arcs of non-adjacent spouses dip below cards

interface PrintPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  layout: TreeLayoutResult;
  familyName: string;
  /** e.g. "по отцовской линии" when a lineage filter is active */
  subtitleNote?: string;
}

function pluralPeople(n: number) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return `${n} человек`;
  if (m10 >= 2 && m10 <= 4) return `${n} человека`;
  return `${n} человек`;
}

function pluralGenerations(n: number) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return `${n} поколений`;
  if (m10 === 1) return `${n} поколение`;
  if (m10 >= 2 && m10 <= 4) return `${n} поколения`;
  return `${n} поколений`;
}

function todayRu() {
  const d = new Date();
  return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()}`;
}

/** The printable sheet itself: header, the whole tree scaled to fit, footer. */
const TreeSheet: React.FC<{
  paper: Paper;
  layout: TreeLayoutResult;
  familyName: string;
  subtitleNote?: string;
  showPhotos: boolean;
}> = ({ paper, layout, familyName, subtitleNote, showPhotos }) => {
  const { w, h } = PAPER[paper];
  const availW = w - SHEET_PADDING * 2;
  const availH = h - SHEET_PADDING * 2 - HEADER_H - FOOTER_H;

  const originX = layout.bounds.minX - LABEL_W;
  const originY = layout.bounds.minY;
  const contentW = layout.bounds.maxX - originX;
  const contentH = layout.bounds.maxY - originY + ARC_ROOM;
  const scale = Math.min(availW / contentW, availH / contentH, 1.15);
  const offsetX = (availW - contentW * scale) / 2;
  // Wide, shallow trees would hug the header; centre them in the free space instead.
  const offsetY = Math.max(0, (availH - contentH * scale) / 2);

  const subtitle = [
    'Родовое древо',
    pluralPeople(layout.nodes.length),
    pluralGenerations(layout.generations.length),
    subtitleNote,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className="print-sheet relative bg-[#FAF8F5] text-[#26221E] overflow-hidden"
      style={{ width: w, height: h, padding: SHEET_PADDING }}
    >
      <div className="absolute inset-[18px] border border-[#E6E0D5] rounded-[20px] pointer-events-none" />

      {/* Header */}
      <div style={{ height: HEADER_H }} className="relative text-center">
        <div className="font-display font-bold leading-none" style={{ fontSize: paper === 'A3' ? 56 : 44 }}>
          {familyName || 'Родовое древо'}
        </div>
        <div className="mx-auto mt-3 mb-2.5 w-14 h-[2px] rounded bg-[#B85D3B]" />
        <div className="text-[#5E574E]" style={{ fontSize: paper === 'A3' ? 19 : 15 }}>{subtitle}</div>
      </div>

      {/* Tree */}
      <div className="relative" style={{ width: availW, height: availH }}>
        <div
          className="absolute"
          data-print-scale={scale.toFixed(3)}
          style={{
            top: offsetY,
            left: offsetX,
            width: contentW,
            height: contentH,
            transform: `scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          <div className="absolute" style={{ left: -originX, top: -originY }}>
            {layout.generations.map((gen) => (
              <div
                key={gen.generation}
                className="absolute text-right pr-3 whitespace-nowrap"
                style={{ left: layout.bounds.minX - LABEL_W, top: gen.y + CARD_HEIGHT / 2 - 10, width: LABEL_W - 14 }}
              >
                <span className="text-[15px] font-semibold uppercase tracking-[0.12em] text-[#8A8175]">
                  {gen.label}
                </span>
              </div>
            ))}

            <svg className="absolute overflow-visible" style={{ left: 0, top: 0, width: 1, height: 1 }} aria-hidden="true">
              {layout.parentChildConnectors.map((c) => (
                <path key={c.id} d={c.path} fill="none" stroke="#B9AE9E" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              ))}
              {layout.spouseConnectors.map((sp) => {
                const midX = (sp.x1 + sp.x2) / 2;
                const midY = (sp.y1 + sp.y2) / 2;
                if (!sp.adjacent) {
                  const arcY = Math.max(sp.y1, sp.y2) + CARD_HEIGHT / 2 + 18;
                  return (
                    <path
                      key={sp.id}
                      d={`M ${sp.x1 - CARD_WIDTH / 2} ${sp.y1 + CARD_HEIGHT / 2} Q ${midX} ${arcY} ${sp.x2 + CARD_WIDTH / 2} ${sp.y2 + CARD_HEIGHT / 2}`}
                      fill="none"
                      stroke="#C9A18F"
                      strokeWidth={1.6}
                      strokeDasharray="4 4"
                    />
                  );
                }
                return (
                  <g key={sp.id}>
                    <line x1={sp.x1} y1={sp.y1} x2={sp.x2} y2={sp.y2} stroke="#C9A18F" strokeWidth={1.8} />
                    <circle cx={midX} cy={midY} r={4} fill="#FAF8F5" stroke="#C9A18F" strokeWidth={1.5} />
                  </g>
                );
              })}
            </svg>

            {layout.nodes.map(({ member, x, y }) => (
              <div
                key={member.id}
                className="absolute rounded-xl bg-white border border-[#DDD5C8] p-3 flex items-center gap-3"
                style={{ left: x, top: y, width: CARD_WIDTH, height: CARD_HEIGHT }}
              >
                {showPhotos && (
                  <GenderAvatar
                    src={member.avatar}
                    gender={member.gender}
                    alt={`${member.firstName} ${member.lastName}`}
                    size="md"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-display text-[22px] leading-none font-bold">
                    {member.firstName}
                  </div>
                  <div className="font-display text-[19px] leading-tight font-semibold text-[#3A342E] truncate">
                    {member.lastName}
                  </div>
                  {member.maidenName && (
                    <div className="text-[13px] text-[#8A8175] truncate">в дев. {member.maidenName}</div>
                  )}
                  <div className="text-[15px] font-medium text-[#4A443D] tabular-nums mt-0.5 truncate">
                    {formatLifespan(member)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{ height: FOOTER_H, fontSize: paper === 'A3' ? 14 : 11 }}
        className="relative flex items-end justify-between text-[#8A8175]"
      >
        <span>Составлено {todayRu()}</span>
        <span>{typeof window !== 'undefined' ? window.location.host : ''}</span>
      </div>
    </div>
  );
};

export const PrintPreview: React.FC<PrintPreviewProps> = ({
  isOpen,
  onClose,
  layout,
  familyName,
  subtitleNote,
}) => {
  const [paper, setPaper] = useState<Paper>(() => {
    try {
      return new URLSearchParams(window.location.search).get('print')?.toUpperCase() === 'A3' ? 'A3' : 'A4';
    } catch {
      return 'A4';
    }
  });
  const [showPhotos, setShowPhotos] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(0.5);

  // Scale the sheet to fit the preview area on screen.
  useLayoutEffect(() => {
    if (!isOpen) return;
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const { w, h } = PAPER[paper];
      setFit(Math.max(0.1, Math.min((r.width - 32) / w, (r.height - 32) / h, 1)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen, paper]);

  // Page size for the browser's print dialog.
  useEffect(() => {
    if (!isOpen) return;
    const style = document.createElement('style');
    style.setAttribute('data-print-page', '');
    style.textContent = `@page { size: ${paper} landscape; margin: 0; }`;
    document.head.appendChild(style);
    document.documentElement.classList.add('printing-tree');
    return () => {
      style.remove();
      document.documentElement.classList.remove('printing-tree');
    };
  }, [isOpen, paper]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const { w, h } = PAPER[paper];
  const segment = (active: boolean) =>
    `px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
      active ? 'bg-white text-[#2D5A4C] shadow-xs' : 'text-[#5E574E] hover:text-[#26221E]'
    }`;

  return (
    <div className="print-overlay fixed inset-0 z-[60] flex flex-col bg-[#E9E4DC]" role="dialog" aria-modal="true" aria-label="Печать древа">
      {/* Controls (hidden when printing) */}
      <div className="print-hide bg-white border-b border-[#E6E0D5] px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-xl font-semibold text-[#26221E] mr-auto">Печать древа</h2>

        <div className="inline-flex items-center p-1 bg-[#F3EFE8] rounded-lg border border-[#E6E0D5]" role="group" aria-label="Размер бумаги">
          {(Object.keys(PAPER) as Paper[]).map((p) => (
            <button key={p} type="button" onClick={() => setPaper(p)} className={segment(paper === p)} title={PAPER[p].label}>
              {p}
            </button>
          ))}
        </div>

        <label className="inline-flex items-center gap-2 text-xs text-[#26221E] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showPhotos}
            onChange={(e) => setShowPhotos(e.target.checked)}
            className="w-4 h-4 accent-[#2D5A4C] cursor-pointer"
          />
          Фотографии
        </label>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2D5A4C] hover:bg-[#23473C] text-white text-sm font-medium transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Печать / PDF
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-[#5E574E] hover:bg-[#F3EFE8] cursor-pointer"
          aria-label="Закрыть предпросмотр"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <p className="print-hide px-4 sm:px-6 py-2 text-xs text-[#5E574E]">
        Альбомная ориентация, {PAPER[paper].label}. Чтобы получить файл, в окне печати выберите «Сохранить как PDF».
        {subtitleNote ? ' Печатается текущая ветка — чтобы напечатать всех, выберите фильтр «Все».' : ''}
      </p>

      {/* Preview stage */}
      <div ref={stageRef} className="print-stage flex-1 min-h-0 overflow-hidden flex items-center justify-center">
        <div className="print-scale-box" style={{ width: w * fit, height: h * fit }}>
          <div className="print-scale shadow-xl" style={{ transform: `scale(${fit})`, transformOrigin: '0 0', width: w, height: h }}>
            <TreeSheet paper={paper} layout={layout} familyName={familyName} subtitleNote={subtitleNote} showPhotos={showPhotos} />
          </div>
        </div>
      </div>
    </div>
  );
};
