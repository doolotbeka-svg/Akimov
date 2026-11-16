import { FamilyMember } from '../types/family';

/**
 * Formats full name: "Фамилия Имя Отчество"
 */
export function formatFullName(member: Pick<FamilyMember, 'lastName' | 'firstName' | 'middleName'>): string {
  return [member.lastName, member.firstName, member.middleName]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * Formats short name for compact cards: "Имя Фамилия"
 */
export function formatCardName(member: Pick<FamilyMember, 'firstName' | 'lastName'>): string {
  return [member.firstName, member.lastName].filter(Boolean).join(' ');
}

export const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

export const MONTHS_NOMINATIVE = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

export interface DateParts {
  year: number;
  /** 1–12, or null when only the year is known */
  month: number | null;
  /** 1–31, or null when only the year is known */
  day: number | null;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function validParts(year: number, month: number, day: number): DateParts | null {
  if (year < 1000 || year > 2999) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

/**
 * Reads a date the way relatives actually type it:
 * - "1985"                     → year only
 * - "1985-07-05"               → ISO (what the app saves)
 * - "05.07.1985", "5/7/1985"   → day.month.year
 * - "1985.05.07"               → year.DAY.month — the convention used in this family
 *                                (e.g. "2020.28.07"); if that is impossible, year.month.day
 */
export function parseDate(dateStr?: string): DateParts | null {
  if (!dateStr) return null;
  const s = dateStr.trim();

  let m = s.match(/^(\d{4})$/);
  if (m) {
    const year = +m[1];
    return year >= 1000 && year <= 2999 ? { year, month: null, day: null } : null;
  }

  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return validParts(+m[1], +m[2], +m[3]);

  m = s.match(/^(\d{4})[./\s](\d{1,2})[./\s](\d{1,2})$/);
  if (m) return validParts(+m[1], +m[3], +m[2]) ?? validParts(+m[1], +m[2], +m[3]);

  m = s.match(/^(\d{1,2})[./\-\s](\d{1,2})[./\-\s](\d{4})$/);
  if (m) return validParts(+m[3], +m[2], +m[1]);

  return null;
}

/** Turns date parts into the stored form: "YYYY" or "YYYY-MM-DD". */
export function formatStoredDate(parts: DateParts | null): string | undefined {
  if (!parts) return undefined;
  if (parts.month === null || parts.day === null) return String(parts.year);
  const mm = String(parts.month).padStart(2, '0');
  const dd = String(parts.day).padStart(2, '0');
  return `${parts.year}-${mm}-${dd}`;
}

/**
 * Extracts the year from any supported date format
 */
export function extractYear(dateStr?: string): number | null {
  return parseDate(dateStr)?.year ?? null;
}

/**
 * Formats a date into readable Russian (e.g., "14 мая 1942" or "1942")
 */
export function formatRussianDate(dateStr?: string): string {
  if (!dateStr) return '';
  const p = parseDate(dateStr);
  if (!p) return dateStr.trim();
  if (p.month === null || p.day === null) return String(p.year);
  return `${p.day} ${MONTHS_GENITIVE[p.month - 1]} ${p.year}`;
}

/**
 * Pluralizes Russian "год / года / лет"
 */
export function pluralizeYears(age: number): string {
  const abs = Math.abs(age);
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 14) return `${age} лет`;
  if (mod10 === 1) return `${age} год`;
  if (mod10 >= 2 && mod10 <= 4) return `${age} года`;
  return `${age} лет`;
}

/**
 * Calculates age from birthDate and optional deathDate/isLiving
 */
export function calculateAge(
  birthDate?: string,
  deathDate?: string,
  isLiving: boolean = true
): number | null {
  if (!birthDate) return null;

  const parseParts = (d: string) => {
    const p = parseDate(d);
    if (!p) return null;
    if (p.month !== null && p.day !== null) {
      return { year: p.year, month: p.month - 1, day: p.day, exact: true };
    }
    return { year: p.year, month: 0, day: 1, exact: false };
  };

  const b = parseParts(birthDate);
  if (!b) return null;

  let end = {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    day: new Date().getDate(),
    exact: true,
  };

  if (!isLiving) {
    if (!deathDate) return null;
    const d = parseParts(deathDate);
    if (!d) return null;
    end = d;
  }

  let age = end.year - b.year;
  if (b.exact && end.exact) {
    if (end.month < b.month || (end.month === b.month && end.day < b.day)) {
      age -= 1;
    }
  }
  return age >= 0 && age <= 140 ? age : null;
}

/**
 * Formats concise lifespan string for tree cards: "1942 — 2016" or "род. 1970"
 */
export function formatLifespan(member: Pick<FamilyMember, 'birthDate' | 'deathDate' | 'isLiving'>): string {
  const bYear = extractYear(member.birthDate);
  const dYear = extractYear(member.deathDate);

  if (bYear && !member.isLiving && dYear) {
    return `${bYear} — ${dYear}`;
  }
  if (bYear && member.isLiving) {
    return `род. ${bYear}`;
  }
  if (bYear && !member.isLiving) {
    return `${bYear} — ?`;
  }
  if (!member.isLiving && dYear) {
    return `† ${dYear}`;
  }
  return member.isLiving ? 'жив(а)' : 'ушёл из жизни';
}

/**
 * Resizes and compresses an uploaded image file to fit reliably in localStorage
 */
export function resizeImageToDataUrl(
  file: File,
  maxDimension: number = 640,
  quality: number = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл изображения.'));
    reader.onload = () => {
      const result = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Файл не является корректным изображением.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Generates a unique readable ID for new family members or gallery items
 */
export function generateId(prefix: string = 'm'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
