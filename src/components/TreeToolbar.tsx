import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Pencil, Search, X } from 'lucide-react';
import { FamilyMember, LineageFilter } from '../types/family';
import { formatFullName, formatLifespan } from '../utils/dateUtils';
import { GenderAvatar } from './GenderAvatar';

interface TreeToolbarProps {
  familyName: string;
  onUpdateFamilyName: (name: string) => void;
  members: Record<string, FamilyMember>;
  visibleCount: number;
  generationCount: number;
  lineageFilter: LineageFilter;
  onLineageFilterChange: (filter: LineageFilter) => void;
  anchorPersonId: string | null;
  onAnchorPersonChange: (id: string) => void;
  onSelectAndCenter: (memberId: string) => void;
}

export const TreeToolbar: React.FC<TreeToolbarProps> = ({
  familyName,
  onUpdateFamilyName,
  members,
  visibleCount,
  generationCount,
  lineageFilter,
  onLineageFilterChange,
  anchorPersonId,
  onAnchorPersonChange,
  onSelectAndCenter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(familyName);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftTitle(familyName);
  }, [familyName]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const allMembersList = useMemo(() => Object.values(members), [members]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allMembersList
      .filter((m) => {
        const haystack = [m.lastName, m.firstName, m.middleName, m.maidenName, m.profession]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 8);
  }, [allMembersList, searchQuery]);

  const saveFamilyTitle = () => {
    const cleaned = draftTitle.trim();
    if (cleaned) {
      onUpdateFamilyName(cleaned);
    } else {
      setDraftTitle(familyName);
    }
    setEditingTitle(false);
  };

  const countLabel = (n: number, one: string, few: string, many: string) => {
    const mod100 = n % 100;
    const mod10 = n % 10;
    if (mod100 >= 11 && mod100 <= 14) return `${n} ${many}`;
    if (mod10 === 1) return `${n} ${one}`;
    if (mod10 >= 2 && mod10 <= 4) return `${n} ${few}`;
    return `${n} ${many}`;
  };

  return (
    <section
      aria-label="Панель управления древом"
      className="relative z-20 bg-white/90 backdrop-blur-xs border-b border-[#E6E0D5]"
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Family Name & Quiet Metadata */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveFamilyTitle();
                  if (e.key === 'Escape') {
                    setDraftTitle(familyName);
                    setEditingTitle(false);
                  }
                }}
                autoFocus
                className="font-display text-xl font-semibold text-[#26221E] bg-[#FAF8F5] border border-[#2D5A4C] rounded-md px-2.5 py-0.5 focus:outline-none"
                aria-label="Название семейного альбома"
              />
              <button
                type="button"
                onClick={saveFamilyTitle}
                className="p-1.5 rounded-md bg-[#2D5A4C] text-white hover:bg-[#23473C] cursor-pointer"
                aria-label="Сохранить название"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className="group inline-flex items-center gap-1.5 text-left cursor-pointer min-w-0"
              title="Нажмите, чтобы переименовать семейный альбом"
            >
              <h1 className="font-display text-xl sm:text-2xl font-semibold text-[#26221E] truncate">
                {familyName}
              </h1>
              <Pencil className="w-3.5 h-3.5 text-[#8A8175] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )}

          {allMembersList.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-[#8A8175] tabular-nums whitespace-nowrap">
              <span>{countLabel(visibleCount, 'человек', 'человека', 'человек')}</span>
              <span aria-hidden="true">·</span>
              <span>{countLabel(generationCount, 'поколение', 'поколения', 'поколений')}</span>
            </div>
          )}
        </div>

        {/* Search & Lineage Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Input with Live Dropdown */}
          <div ref={searchBoxRef} className="relative flex-1 sm:w-64 lg:w-72">
            <Search className="w-4 h-4 text-[#8A8175] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              placeholder="Поиск по имени или фамилии..."
              className="w-full pl-9 pr-8 py-2 text-sm bg-[#FAF8F5] border border-[#E6E0D5] rounded-lg text-[#26221E] placeholder:text-[#8A8175] focus:outline-none focus:border-[#2D5A4C] focus:bg-white transition-colors"
              aria-label="Поиск по имени или фамилии"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchOpen(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A8175] hover:text-[#26221E] cursor-pointer"
                aria-label="Очистить поиск"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {searchOpen && searchQuery.trim() !== '' && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#E6E0D5] rounded-xl shadow-lg overflow-hidden z-40">
                {searchResults.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-[#8A8175]">
                    Никого не найдено по запросу «{searchQuery}»
                  </div>
                ) : (
                  <ul className="max-h-72 overflow-y-auto divide-y divide-[#F3EFE8]">
                    {searchResults.map((person) => (
                      <li key={person.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectAndCenter(person.id);
                            setSearchOpen(false);
                            setSearchQuery('');
                          }}
                          className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[#FAF8F5] transition-colors text-left cursor-pointer"
                        >
                          <GenderAvatar
                            src={person.avatar}
                            gender={person.gender}
                            alt={formatFullName(person)}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-[#26221E] truncate">
                              {formatFullName(person)}
                              {person.maidenName ? ` (в дев. ${person.maidenName})` : ''}
                            </div>
                            <div className="text-xs text-[#8A8175] tabular-nums truncate">
                              {formatLifespan(person)}
                              {person.profession ? ` · ${person.profession}` : ''}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Segmented Lineage Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Фильтр по родовой линии"
              className="inline-flex items-center p-1 bg-[#F3EFE8] rounded-lg border border-[#E6E0D5]"
            >
              {(
                [
                  { id: 'all', label: 'Все' },
                  { id: 'paternal', label: 'По отцовской' },
                  { id: 'maternal', label: 'По материнской' },
                ] as const
              ).map((item) => {
                const active = lineageFilter === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onLineageFilterChange(item.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-white text-[#2D5A4C] shadow-xs'
                        : 'text-[#5E574E] hover:text-[#26221E]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {lineageFilter !== 'all' && allMembersList.length > 0 && (
              <label className="inline-flex items-center gap-1.5 text-xs text-[#5E574E]">
                <span className="whitespace-nowrap">От кого:</span>
                <select
                  value={anchorPersonId ?? ''}
                  onChange={(e) => onAnchorPersonChange(e.target.value)}
                  className="bg-[#FAF8F5] border border-[#E6E0D5] rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#26221E] focus:outline-none focus:border-[#2D5A4C] max-w-[170px] cursor-pointer"
                >
                  {allMembersList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
