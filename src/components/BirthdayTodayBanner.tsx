import React, { useState } from 'react';
import { X } from 'lucide-react';
import { UpcomingBirthday } from '../utils/birthdays';
import { pluralizeYears } from '../utils/dateUtils';

interface BirthdayTodayBannerProps {
  birthdays: UpcomingBirthday[]; // only today's
  dayKey: string; // e.g. "2026-11-17", so dismissing lasts for the day
  onSelectMember: (memberId: string) => void;
}

const DISMISS_KEY = 'semeyny_albom_birthday_banner_dismissed';

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

export const BirthdayTodayBanner: React.FC<BirthdayTodayBannerProps> = ({
  birthdays,
  dayKey,
  onSelectMember,
}) => {
  const [dismissedDay, setDismissedDay] = useState(readDismissed);
  if (birthdays.length === 0 || dismissedDay === dayKey) return null;

  const dismiss = () => {
    setDismissedDay(dayKey);
    try {
      localStorage.setItem(DISMISS_KEY, dayKey);
    } catch {
      // fine: it just shows again after reload
    }
  };

  return (
    <div className="relative z-10 bg-[#F6EAE4] border-b border-[#E8CFC4] text-[#7A3B24]">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2 flex items-center gap-2.5 text-sm">
        <span aria-hidden="true" className="text-base">🎂</span>
        <p className="flex-1 min-w-0">
          {/* Names stay in the nominative: declining Kyrgyz/Russian surnames automatically is unreliable. */}
          Сегодня день рождения:{' '}
          {birthdays.map((b, i) => (
            <React.Fragment key={b.member.id}>
              {i > 0 && (i === birthdays.length - 1 ? ' и ' : ', ')}
              <button
                type="button"
                onClick={() => onSelectMember(b.member.id)}
                className="font-semibold underline decoration-[#B85D3B]/40 underline-offset-2 hover:decoration-[#B85D3B] cursor-pointer"
              >
                {b.member.firstName} {b.member.lastName}
              </button>
              {b.turningAge !== null && <span> — {pluralizeYears(b.turningAge)}</span>}
            </React.Fragment>
          ))}
          ! Не забудьте поздравить.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 p-0.5 rounded hover:bg-[#E8CFC4]/60 cursor-pointer"
          aria-label="Скрыть до завтра"
          title="Скрыть до завтра"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
