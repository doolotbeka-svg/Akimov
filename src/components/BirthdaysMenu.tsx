import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Cake } from 'lucide-react';
import { FamilyMember } from '../types/family';
import {
  countMissingBirthdays,
  formatDayMonth,
  formatDaysUntil,
  formatTurning,
  UpcomingBirthday,
} from '../utils/birthdays';
import { formatFullName } from '../utils/dateUtils';
import { GenderAvatar } from './GenderAvatar';

interface BirthdaysMenuProps {
  members: Record<string, FamilyMember>;
  upcoming: UpcomingBirthday[];
  onSelectMember: (memberId: string) => void;
}

/** Birthdays within this many days are counted on the button badge. */
const SOON_DAYS = 7;

export const BirthdaysMenu: React.FC<BirthdaysMenuProps> = ({
  members,
  upcoming,
  onSelectMember,
}) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const soonCount = upcoming.filter((b) => b.daysUntil <= SOON_DAYS).length;
  const hasToday = upcoming.some((b) => b.daysUntil === 0);
  const missing = useMemo(() => countMissingBirthdays(members), [members]);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`relative inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
          open || hasToday
            ? 'bg-[#F6EAE4] border-[#E8CFC4] text-[#B85D3B]'
            : 'bg-[#FAF8F5] border-[#E6E0D5] text-[#5E574E] hover:text-[#26221E] hover:bg-[#F3EFE8]'
        }`}
      >
        <Cake className="w-4 h-4" />
        <span>Дни рождения</span>
        {soonCount > 0 && (
          <span
            className="ml-0.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-[#B85D3B] text-white text-[10px] font-semibold tabular-nums"
            aria-label={`${soonCount} в ближайшую неделю`}
          >
            {soonCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Ближайшие дни рождения"
          className="absolute left-0 top-full mt-1.5 w-[min(340px,calc(100vw-2rem))] bg-white border border-[#E6E0D5] rounded-xl shadow-lg overflow-hidden z-40"
        >
          <div className="px-4 pt-3.5 pb-2 font-display text-lg font-semibold text-[#26221E]">
            Ближайшие дни рождения
          </div>

          {upcoming.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-[#5E574E] leading-relaxed">
              Пока ни у кого не указаны день и месяц рождения. Откройте карточку человека и
              заполните дату полностью — и здесь появится напоминание.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-[#F3EFE8]">
              {upcoming.map((b) => (
                <li key={b.member.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onSelectMember(b.member.id);
                    }}
                    className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors cursor-pointer ${
                      b.daysUntil === 0 ? 'bg-[#F6EAE4]/60 hover:bg-[#F6EAE4]' : 'hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <GenderAvatar
                      src={b.member.avatar}
                      gender={b.member.gender}
                      alt={formatFullName(b.member)}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-[#26221E] truncate">
                        {b.member.firstName} {b.member.lastName}
                      </div>
                      <div className="text-xs text-[#8A8175] tabular-nums truncate">
                        {formatDayMonth(b.date)}
                        {b.turningAge !== null ? ` · ${formatTurning(b.turningAge)}` : ''}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-medium tabular-nums ${
                        b.daysUntil === 0
                          ? 'text-[#B85D3B]'
                          : b.daysUntil <= SOON_DAYS
                            ? 'text-[#2D5A4C]'
                            : 'text-[#8A8175]'
                      }`}
                    >
                      {b.daysUntil === 0 ? '🎂 Сегодня' : formatDaysUntil(b.daysUntil)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {missing > 0 && upcoming.length > 0 && (
            <p className="px-4 py-2.5 border-t border-[#F3EFE8] text-[11px] text-[#8A8175] leading-relaxed">
              Ещё у {missing} {missing === 1 ? 'человека' : 'человек'} не указаны день и месяц
              рождения — их здесь нет.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
