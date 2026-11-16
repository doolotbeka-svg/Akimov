import { FamilyMember } from '../types/family';
import { MONTHS_GENITIVE, parseDate, pluralizeYears } from './dateUtils';

export interface UpcomingBirthday {
  member: FamilyMember;
  /** The next date this birthday is celebrated (local time, midnight) */
  date: Date;
  /** 0 = today, 1 = tomorrow … */
  daysUntil: number;
  /** Age turned on that day, when the birth year is known */
  turningAge: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Feb 29 birthdays are celebrated on Feb 28 in non-leap years. */
function birthdayInYear(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, Math.min(day, lastDay));
}

/**
 * Living relatives whose birthday (day + month) is known, ordered by how soon
 * the next one comes. People with only a birth year are skipped.
 */
export function getUpcomingBirthdays(
  members: Record<string, FamilyMember>,
  today: Date = new Date()
): UpcomingBirthday[] {
  const base = startOfDay(today);
  const result: UpcomingBirthday[] = [];

  for (const member of Object.values(members)) {
    if (!member.isLiving) continue;
    const p = parseDate(member.birthDate);
    if (!p || p.month === null || p.day === null) continue;

    let next = birthdayInYear(base.getFullYear(), p.month, p.day);
    if (next < base) next = birthdayInYear(base.getFullYear() + 1, p.month, p.day);

    const turningAge = next.getFullYear() - p.year;
    result.push({
      member,
      date: next,
      daysUntil: Math.round((next.getTime() - base.getTime()) / DAY_MS),
      turningAge: turningAge > 0 && turningAge <= 140 ? turningAge : null,
    });
  }

  return result.sort(
    (a, b) => a.daysUntil - b.daysUntil || a.member.firstName.localeCompare(b.member.firstName, 'ru')
  );
}

/** Living relatives without a full birth date (so they can't appear in the list). */
export function countMissingBirthdays(members: Record<string, FamilyMember>): number {
  return Object.values(members).filter((m) => {
    if (!m.isLiving) return false;
    const p = parseDate(m.birthDate);
    return !p || p.month === null;
  }).length;
}

export function formatDayMonth(date: Date): string {
  return `${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]}`;
}

export function formatDaysUntil(days: number): string {
  if (days === 0) return 'Сегодня';
  if (days === 1) return 'Завтра';
  if (days === 2) return 'Послезавтра';
  const mod100 = days % 100;
  const mod10 = days % 10;
  const word =
    mod100 >= 11 && mod100 <= 14
      ? 'дней'
      : mod10 === 1
        ? 'день'
        : mod10 >= 2 && mod10 <= 4
          ? 'дня'
          : 'дней';
  return `Через ${days} ${word}`;
}

export function formatTurning(age: number | null): string {
  if (age === null) return '';
  return `исполнится ${pluralizeYears(age)}`;
}
