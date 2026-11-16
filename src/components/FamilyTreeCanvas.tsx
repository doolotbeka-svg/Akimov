import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Maximize2, Minus, Plus, Sparkles, UserPlus } from 'lucide-react';
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  TreeLayoutResult,
} from '../utils/treeLayout';
import {
  calculateAge,
  formatLifespan,
  pluralizeYears,
} from '../utils/dateUtils';
import { GenderAvatar } from './GenderAvatar';

export interface FamilyTreeCanvasHandle {
  centerOnPerson: (memberId: string) => void;
  fitToScreen: () => void;
}

interface FamilyTreeCanvasProps {
  layout: TreeLayoutResult;
  selectedMemberId: string | null;
  highlightedMemberId: string | null;
  anchorPersonId: string | null;
  isFiltered: boolean;
  onSelectMember: (memberId: string) => void;
  onAddFirstMember: () => void;
  onRestoreDemo: () => void;
  hasAnyMembers: boolean;
}

const MIN_SCALE = 0.35;
const MAX_SCALE = 1.85;

export const FamilyTreeCanvas = React.forwardRef<FamilyTreeCanvasHandle, FamilyTreeCanvasProps>(
  (
    {
      layout,
      selectedMemberId,
      highlightedMemberId,
      anchorPersonId,
      isFiltered,
      onSelectMember,
      onAddFirstMember,
      onRestoreDemo,
      hasAnyMembers,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);

    const dragStateRef = useRef<{
      active: boolean;
      moved: boolean;
      startX: number;
      startY: number;
      originX: number;
      originY: number;
    }>({
      active: false,
      moved: false,
      startX: 0,
      startY: 0,
      originX: 0,
      originY: 0,
    });

    const pinchRef = useRef<{
      active: boolean;
      startDist: number;
      startScale: number;
      midX: number;
      midY: number;
    }>({
      active: false,
      startDist: 0,
      startScale: 1,
      midX: 0,
      midY: 0,
    });

    const fitToScreen = useCallback(() => {
      const el = containerRef.current;
      if (!el || layout.nodes.length === 0) return;
      const rect = el.getBoundingClientRect();
      const padX = rect.width < 640 ? 36 : 96;
      const padY = rect.height < 640 ? 48 : 80;

      const contentW = Math.max(layout.bounds.width, CARD_WIDTH);
      const contentH = Math.max(layout.bounds.height, CARD_HEIGHT);

      const scaleX = (rect.width - padX * 2) / contentW;
      const scaleY = (rect.height - padY * 2) / contentH;
      const nextScale = Math.max(MIN_SCALE, Math.min(1.05, Math.min(scaleX, scaleY)));

      const centerX = (layout.bounds.minX + layout.bounds.maxX) / 2;
      const centerY = (layout.bounds.minY + layout.bounds.maxY) / 2;

      setIsAnimating(true);
      setTransform({
        scale: nextScale,
        x: rect.width / 2 - centerX * nextScale,
        y: rect.height / 2 - centerY * nextScale,
      });
    }, [layout]);

    const centerOnPerson = useCallback(
      (memberId: string) => {
        const el = containerRef.current;
        const pos = layout.nodeMap[memberId];
        if (!el || !pos) return;

        const rect = el.getBoundingClientRect();
        const targetScale = Math.max(transform.scale, 0.95);
        const cardCenterX = pos.x + CARD_WIDTH / 2;
        const cardCenterY = pos.y + CARD_HEIGHT / 2;

        setIsAnimating(true);
        setTransform({
          scale: targetScale,
          x: rect.width / 2 - cardCenterX * targetScale,
          y: rect.height / 2 - cardCenterY * targetScale,
        });
      },
      [layout.nodeMap, transform.scale]
    );

    useImperativeHandle(
      ref,
      () => ({
        centerOnPerson,
        fitToScreen,
      }),
      [centerOnPerson, fitToScreen]
    );

    // Fit initially and when node count or filter changes dramatically
    const prevLayoutKeyRef = useRef<string>('');
    useEffect(() => {
      const key = `${layout.nodes.length}-${isFiltered}-${layout.generations.length}`;
      if (layout.nodes.length > 0 && prevLayoutKeyRef.current !== key) {
        prevLayoutKeyRef.current = key;
        // Wait a frame so container measurements are ready
        const raf = requestAnimationFrame(() => fitToScreen());
        return () => cancelAnimationFrame(raf);
      }
    }, [layout, isFiltered, fitToScreen]);

    useEffect(() => {
      if (!isAnimating) return;
      const t = setTimeout(() => setIsAnimating(false), 360);
      return () => clearTimeout(t);
    }, [isAnimating]);

    const zoomBy = (factor: number, focalClientX?: number, focalClientY?: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const fx = focalClientX !== undefined ? focalClientX - rect.left : rect.width / 2;
      const fy = focalClientY !== undefined ? focalClientY - rect.top : rect.height / 2;

      setIsAnimating(focalClientX === undefined);
      setTransform((prev) => {
        const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * factor));
        const ratio = nextScale / prev.scale;
        return {
          scale: nextScale,
          x: fx - (fx - prev.x) * ratio,
          y: fy - (fy - prev.y) * ratio,
        };
      });
    };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      zoomBy(factor, e.clientX, e.clientY);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      // Only start canvas drag if not clicking an interactive button inside a card
      setIsAnimating(false);
      dragStateRef.current = {
        active: true,
        moved: false,
        startX: e.clientX,
        startY: e.clientY,
        originX: transform.x,
        originY: transform.y,
      };
      setIsDragging(true);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!dragStateRef.current.active) return;
      const dx = e.clientX - dragStateRef.current.startX;
      const dy = e.clientY - dragStateRef.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        dragStateRef.current.moved = true;
      }
      setTransform((prev) => ({
        ...prev,
        x: dragStateRef.current.originX + dx,
        y: dragStateRef.current.originY + dy,
      }));
    };

    const stopMouseDrag = () => {
      dragStateRef.current.active = false;
      setIsDragging(false);
    };

    // Touch pan & pinch-to-zoom support
    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
      setIsAnimating(false);
      if (e.touches.length === 1) {
        const t = e.touches[0];
        dragStateRef.current = {
          active: true,
          moved: false,
          startX: t.clientX,
          startY: t.clientY,
          originX: transform.x,
          originY: transform.y,
        };
        setIsDragging(true);
      } else if (e.touches.length === 2) {
        dragStateRef.current.active = false;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        pinchRef.current = {
          active: true,
          startDist: dist,
          startScale: transform.scale,
          midX: (t1.clientX + t2.clientX) / 2,
          midY: (t1.clientY + t2.clientY) / 2,
        };
      }
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 1 && dragStateRef.current.active) {
        const t = e.touches[0];
        const dx = t.clientX - dragStateRef.current.startX;
        const dy = t.clientY - dragStateRef.current.startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          dragStateRef.current.moved = true;
        }
        setTransform((prev) => ({
          ...prev,
          x: dragStateRef.current.originX + dx,
          y: dragStateRef.current.originY + dy,
        }));
      } else if (e.touches.length === 2 && pinchRef.current.active) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        if (pinchRef.current.startDist > 0) {
          const rect = containerRef.current?.getBoundingClientRect();
          const fx = rect ? pinchRef.current.midX - rect.left : 0;
          const fy = rect ? pinchRef.current.midY - rect.top : 0;
          const nextScale = Math.max(
            MIN_SCALE,
            Math.min(MAX_SCALE, pinchRef.current.startScale * (dist / pinchRef.current.startDist))
          );
          setTransform((prev) => {
            const ratio = nextScale / prev.scale;
            return {
              scale: nextScale,
              x: fx - (fx - prev.x) * ratio,
              y: fy - (fy - prev.y) * ratio,
            };
          });
        }
      }
    };

    const handleTouchEnd = () => {
      dragStateRef.current.active = false;
      pinchRef.current.active = false;
      setIsDragging(false);
    };

    const activeFocusId = hoveredMemberId || selectedMemberId;

    // Empty state when user cleared the tree
    if (!hasAnyMembers) {
      return (
        <div className="relative flex-1 canvas-paper-grid flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-[#E6E0D5] rounded-2xl p-8 text-center shadow-sm">
            <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-[#E9EFEA] text-[#2D5A4C] flex items-center justify-center">
              <UserPlus className="w-6 h-6" />
            </div>
            <h2 className="font-display text-2xl font-semibold text-[#26221E] mb-2">
              Ваш семейный альбом пока пуст
            </h2>
            <p className="text-sm text-[#5E574E] leading-relaxed mb-6">
              Начните летопись с первого человека — например, с себя, родителей или бабушки с дедушкой. После этого можно добавлять супругов, родителей и детей прямо из карточки.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={onAddFirstMember}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#2D5A4C] hover:bg-[#23473C] text-white text-sm font-medium transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Добавить первого человека</span>
              </button>
              <button
                type="button"
                onClick={onRestoreDemo}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#E6E0D5] bg-[#FAF8F5] hover:bg-[#F3EFE8] text-[#26221E] text-sm font-medium transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#B85D3B]" />
                <span>Загрузить пример</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopMouseDrag}
        onMouseLeave={stopMouseDrag}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative flex-1 overflow-hidden canvas-paper-grid select-none touch-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        aria-label="Интерактивное родовое древо"
      >
        {/* World Transform Layer */}
        <div
          style={{
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
            transformOrigin: '0 0',
            transition: isAnimating ? 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
          }}
          className="absolute top-0 left-0 will-change-transform"
        >
          {/* Generation Labels along left of tree */}
          {layout.generations.map((gen) => (
            <div
              key={gen.generation}
              style={{
                left: layout.bounds.minX - 165,
                top: gen.y + CARD_HEIGHT / 2 - 12,
                width: 140,
              }}
              className="absolute text-right pr-3 pointer-events-none"
            >
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#8A8175]">
                {gen.label}
              </span>
            </div>
          ))}

          {/* SVG Connectors Layer */}
          <svg
            className="absolute overflow-visible pointer-events-none"
            style={{ left: 0, top: 0, width: 1, height: 1 }}
            aria-hidden="true"
          >
            {/* Parent -> Child Orthogonal Paths */}
            {layout.parentChildConnectors.map((conn) => {
              const isRelated =
                activeFocusId !== null &&
                (conn.parentIds.includes(activeFocusId) || conn.childIds.includes(activeFocusId));
              return (
                <path
                  key={conn.id}
                  d={conn.path}
                  fill="none"
                  stroke={isRelated ? '#2D5A4C' : '#CFC6B8'}
                  strokeWidth={isRelated ? 2.2 : 1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-colors duration-200"
                />
              );
            })}

            {/* Spouse Bridges */}
            {layout.spouseConnectors.map((sp) => {
              const isRelated =
                activeFocusId !== null &&
                (sp.fromId === activeFocusId || sp.toId === activeFocusId);
              const midX = (sp.x1 + sp.x2) / 2;
              const midY = (sp.y1 + sp.y2) / 2;

              if (!sp.adjacent) {
                const arcY = Math.max(sp.y1, sp.y2) + CARD_HEIGHT / 2 + 18;
                return (
                  <path
                    key={sp.id}
                    d={`M ${sp.x1 - CARD_WIDTH / 2} ${sp.y1 + CARD_HEIGHT / 2} Q ${midX} ${arcY} ${sp.x2 + CARD_WIDTH / 2} ${sp.y2 + CARD_HEIGHT / 2}`}
                    fill="none"
                    stroke={isRelated ? '#B85D3B' : '#D4B2A3'}
                    strokeWidth={1.6}
                    strokeDasharray="4 4"
                  />
                );
              }

              return (
                <g key={sp.id}>
                  <line
                    x1={sp.x1}
                    y1={sp.y1}
                    x2={sp.x2}
                    y2={sp.y2}
                    stroke={isRelated ? '#B85D3B' : '#C9A18F'}
                    strokeWidth={isRelated ? 2.2 : 1.7}
                  />
                  <circle
                    cx={midX}
                    cy={midY}
                    r={4}
                    fill="#FAF8F5"
                    stroke={isRelated ? '#B85D3B' : '#C9A18F'}
                    strokeWidth={1.5}
                  />
                </g>
              );
            })}
          </svg>

          {/* Person Cards */}
          {layout.nodes.map(({ member, x, y }) => {
            const isSelected = selectedMemberId === member.id;
            const isHighlighted = highlightedMemberId === member.id;
            const isAnchorInFilter = isFiltered && anchorPersonId === member.id;
            const age = calculateAge(member.birthDate, member.deathDate, member.isLiving);
            const lifespan = formatLifespan(member);

            return (
              <div
                key={member.id}
                style={{
                  left: x,
                  top: y,
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                }}
                onMouseEnter={() => setHoveredMemberId(member.id)}
                onMouseLeave={() => setHoveredMemberId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragStateRef.current.moved) return;
                  onSelectMember(member.id);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectMember(member.id);
                  }
                }}
                className={`absolute rounded-xl bg-white p-3 flex items-center gap-3 transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#2D5A4C] ${
                  isSelected || isHighlighted
                    ? 'ring-2 ring-[#2D5A4C] shadow-md'
                    : isAnchorInFilter
                      ? 'ring-1 ring-[#B85D3B] shadow-sm'
                      : 'border border-[#E6E0D5] shadow-[0_2px_10px_rgba(38,34,30,0.05)] hover:shadow-[0_6px_18px_rgba(38,34,30,0.09)] hover:border-[#CFC6B8]'
                }`}
              >
                <GenderAvatar
                  src={member.avatar}
                  gender={member.gender}
                  alt={`${member.firstName} ${member.lastName}`}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-display text-[17px] leading-tight font-semibold text-[#26221E] truncate">
                    {member.firstName} {member.lastName}
                  </div>
                  {member.maidenName && (
                    <div className="text-[11px] text-[#8A8175] truncate mt-0.5">
                      в дев. {member.maidenName}
                    </div>
                  )}
                  <div className="text-xs text-[#5E574E] tabular-nums mt-1 truncate">
                    {lifespan}
                    {age !== null ? ` · ${pluralizeYears(age)}` : ''}
                  </div>
                  {member.profession && (
                    <div className="text-[11px] text-[#8A8175] truncate mt-0.5">
                      {member.profession}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom-left subtle navigation hint */}
        <div className="hidden sm:flex items-center gap-2 absolute bottom-4 left-4 px-3 py-1.5 rounded-lg bg-white/85 backdrop-blur-xs border border-[#E6E0D5] text-xs text-[#8A8175] pointer-events-none">
          <span>Перетаскивайте холст мышью · Колёсико для масштаба · Нажмите на карточку для деталей</span>
        </div>

        {/* Bottom-right Zoom & Fit Controls */}
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="absolute bottom-4 right-4 flex items-center gap-1 p-1 bg-white/95 backdrop-blur-xs border border-[#E6E0D5] rounded-xl shadow-sm"
        >
          <button
            type="button"
            onClick={() => zoomBy(0.85)}
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-[#5E574E] hover:bg-[#FAF8F5] hover:text-[#26221E] transition-colors cursor-pointer"
            aria-label="Уменьшить масштаб"
            title="Уменьшить"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAnimating(true);
              const el = containerRef.current;
              if (!el) return;
              const rect = el.getBoundingClientRect();
              const cx = (layout.bounds.minX + layout.bounds.maxX) / 2;
              const cy = (layout.bounds.minY + layout.bounds.maxY) / 2;
              setTransform({
                scale: 1,
                x: rect.width / 2 - cx,
                y: rect.height / 2 - cy,
              });
            }}
            className="px-2.5 h-9 text-xs font-medium text-[#26221E] tabular-nums hover:bg-[#FAF8F5] rounded-lg transition-colors cursor-pointer"
            title="Сбросить масштаб до 100%"
          >
            {Math.round(transform.scale * 100)}%
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1.18)}
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-[#5E574E] hover:bg-[#FAF8F5] hover:text-[#26221E] transition-colors cursor-pointer"
            aria-label="Увеличить масштаб"
            title="Увеличить"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-[#E6E0D5] mx-0.5" />
          <button
            type="button"
            onClick={fitToScreen}
            className="inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-xs font-medium text-[#2D5A4C] hover:bg-[#E9EFEA] transition-colors cursor-pointer whitespace-nowrap"
            title="Вместить всё древо в экран"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Вместить</span>
          </button>
        </div>
      </div>
    );
  }
);

FamilyTreeCanvas.displayName = 'FamilyTreeCanvas';
