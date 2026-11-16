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

/**
 * Extracts 4-digit year from YYYY-MM-DD or YYYY string
 */
export function extractYear(dateStr?: string): number | null {
  if (!dateStr) return null;
  const match = dateStr.trim().match(/^(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Formats YYYY-MM-DD or YYYY into a readable Russian date (e.g., "14 мая 1942" or "1942")
 */
export function formatRussianDate(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (/^\d{4}$/.test(trimmed)) {
    return trimmed;
  }
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!isoMatch) return trimmed;

  const year = parseInt(isoMatch[1], 10);
  const month = parseInt(isoMatch[2], 10) - 1;
  const day = parseInt(isoMatch[3], 10);

  const months = [
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

  if (month < 0 || month > 11 || day < 1 || day > 31) {
    return trimmed;
  }

  return `${day} ${months[month]} ${year}`;
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
    const full = d.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (full) {
      return {
        year: parseInt(full[1], 10),
        month: parseInt(full[2], 10) - 1,
        day: parseInt(full[3], 10),
        exact: true,
      };
    }
    const yr = extractYear(d);
    if (yr !== null) {
      return { year: yr, month: 0, day: 1, exact: false };
    }
    return null;
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
