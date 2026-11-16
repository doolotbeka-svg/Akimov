import { FamilyMember, FamilyTreeData, GalleryItem } from '../types/family';

/**
 * Triggers a browser download for a Blob or string content
 */
function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoke later: revoking synchronously can cancel the download in some browsers (Firefox/Safari)
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exports full family tree data (including photos & gallery) as formatted JSON
 */
export function exportTreeAsJson(data: FamilyTreeData) {
  const safeName = (data.familyName || 'rodovoe-drevo')
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, '-')
    .replace(/^-|-$/g, '');
  const dateTag = new Date().toISOString().slice(0, 10);
  const json = JSON.stringify(data, null, 2);
  triggerDownload(json, `${safeName || 'family-tree'}-${dateTag}.json`, 'application/json;charset=utf-8');
}

function escapeCsvCell(value: string): string {
  const str = String(value ?? '');
  if (/[;"\n\r,]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports family members table as UTF-8 BOM CSV (Excel-friendly)
 */
export function exportTreeAsCsv(data: FamilyTreeData) {
  const headers = [
    'ID',
    'Фамилия',
    'Имя',
    'Отчество',
    'Девичья фамилия',
    'Пол',
    'Дата рождения',
    'Жив(а)',
    'Дата смерти',
    'Место рождения',
    'Место проживания',
    'Профессия',
    'Биография',
    'Факты и истории',
    'ID родителей',
    'ID супругов',
    'ID детей',
  ];

  const rows = Object.values(data.members).map((m) => [
    m.id,
    m.lastName,
    m.firstName,
    m.middleName ?? '',
    m.maidenName ?? '',
    m.gender === 'male' ? 'М' : 'Ж',
    m.birthDate ?? '',
    m.isLiving ? 'Да' : 'Нет',
    m.deathDate ?? '',
    m.birthPlace ?? '',
    m.residence ?? '',
    m.profession ?? '',
    m.bio ?? '',
    (m.facts ?? []).join(' | '),
    m.parentIds.join(','),
    m.spouseIds.join(','),
    m.childIds.join(','),
  ]);

  const csvLines = [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(';'))
    .join('\r\n');

  const dateTag = new Date().toISOString().slice(0, 10);
  // Prepend UTF-8 BOM so Excel opens Cyrillic cleanly
  triggerDownload('\uFEFF' + csvLines, `family-tree-${dateTag}.csv`, 'text/csv;charset=utf-8');
}

/**
 * Cleans relationship links: removes references to missing members and to self,
 * removes duplicates and makes every link two-sided (parent<->child, spouse<->spouse).
 * Protects the UI from broken or hand-edited files.
 */
export function normalizeRelations(
  members: Record<string, FamilyMember>
): Record<string, FamilyMember> {
  const next: Record<string, FamilyMember> = {};
  for (const [id, m] of Object.entries(members)) {
    const clean = (ids: unknown) =>
      Array.from(
        new Set(
          (Array.isArray(ids) ? ids : [])
            .map(String)
            .filter((x) => x !== id && Boolean(members[x]))
        )
      );
    next[id] = {
      ...m,
      id,
      facts: Array.isArray(m.facts) ? m.facts : [],
      gallery: normalizeGallery(m.gallery),
      parentIds: clean(m.parentIds),
      spouseIds: clean(m.spouseIds),
      childIds: clean(m.childIds),
    };
  }

  const link = (list: string[], value: string) => {
    if (!list.includes(value)) list.push(value);
  };
  for (const [id, m] of Object.entries(next)) {
    for (const pid of m.parentIds) link(next[pid].childIds, id);
    for (const cid of m.childIds) link(next[cid].parentIds, id);
    for (const sid of m.spouseIds) link(next[sid].spouseIds, id);
  }
  return next;
}

function normalizeGallery(raw: unknown): GalleryItem[] {
  if (!Array.isArray(raw)) return [];
  const items: GalleryItem[] = [];
  raw.forEach((g, idx) => {
    if (!g || typeof g !== 'object') return;
    const item = g as Partial<GalleryItem>;
    if (typeof item.dataUrl !== 'string' || !item.dataUrl) return;
    items.push({
      id: item.id ? String(item.id) : `gal-imp-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      title: item.title ? String(item.title) : 'Семейный снимок',
      date: item.date ? String(item.date) : undefined,
      dataUrl: item.dataUrl,
      kind: item.kind === 'document' ? 'document' : 'photo',
    });
  });
  return items;
}

/**
 * Parses and validates imported JSON family tree data
 */
export function parseImportedJson(rawText: string): FamilyTreeData {
  const parsed = JSON.parse(rawText);
  if (!parsed || typeof parsed !== 'object' || !parsed.members || typeof parsed.members !== 'object') {
    throw new Error('Файл JSON не содержит корректной структуры родового древа.');
  }

  const normalizedMembers: Record<string, FamilyMember> = {};
  for (const [id, item] of Object.entries(parsed.members)) {
    if (!item || typeof item !== 'object') continue;
    const m = item as Partial<FamilyMember>;
    normalizedMembers[id] = {
      id,
      firstName: String(m.firstName || 'Без имени'),
      lastName: String(m.lastName || ''),
      middleName: m.middleName ? String(m.middleName) : undefined,
      maidenName: m.maidenName ? String(m.maidenName) : undefined,
      gender: m.gender === 'female' ? 'female' : 'male',
      avatar: m.avatar ? String(m.avatar) : undefined,
      birthDate: m.birthDate ? String(m.birthDate) : undefined,
      deathDate: m.deathDate ? String(m.deathDate) : undefined,
      isLiving: typeof m.isLiving === 'boolean' ? m.isLiving : !m.deathDate,
      birthPlace: m.birthPlace ? String(m.birthPlace) : undefined,
      residence: m.residence ? String(m.residence) : undefined,
      profession: m.profession ? String(m.profession) : undefined,
      bio: m.bio ? String(m.bio) : undefined,
      facts: Array.isArray(m.facts) ? m.facts.map(String) : [],
      gallery: normalizeGallery(m.gallery),
      parentIds: Array.isArray(m.parentIds) ? m.parentIds.map(String) : [],
      spouseIds: Array.isArray(m.spouseIds) ? m.spouseIds.map(String) : [],
      childIds: Array.isArray(m.childIds) ? m.childIds.map(String) : [],
    };
  }

  if (Object.keys(normalizedMembers).length === 0) {
    throw new Error('В импортируемом файле не найдено ни одного члена семьи.');
  }

  return {
    familyName: typeof parsed.familyName === 'string' && parsed.familyName.trim() ? parsed.familyName : 'Родовое древо',
    anchorPersonId:
      typeof parsed.anchorPersonId === 'string' && normalizedMembers[parsed.anchorPersonId]
        ? parsed.anchorPersonId
        : Object.keys(normalizedMembers)[0],
    members: normalizeRelations(normalizedMembers),
  };
}

/**
 * Parses semicolon or comma separated CSV back into FamilyTreeData
 */
export function parseImportedCsv(rawText: string): FamilyTreeData {
  const clean = rawText.replace(/^\uFEFF/, '').trim();
  const lines = parseCsvRows(clean);
  if (lines.length < 2) {
    throw new Error('CSV-файл пуст или содержит только заголовки.');
  }

  const members: Record<string, FamilyMember> = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i];
    if (cols.length < 3) continue;
    const id = cols[0]?.trim() || `imp-${i}`;
    const genderRaw = (cols[5] || '').trim().toLowerCase();
    const isLivingRaw = (cols[7] || '').trim().toLowerCase();
    const deathDate = cols[8]?.trim() || undefined;
    const isLiving =
      isLivingRaw === 'нет' || isLivingRaw === 'no' || isLivingRaw === 'false'
        ? false
        : isLivingRaw === 'да' || isLivingRaw === 'yes' || isLivingRaw === 'true'
          ? true
          : !deathDate;

    members[id] = {
      id,
      lastName: cols[1]?.trim() || '',
      firstName: cols[2]?.trim() || 'Без имени',
      middleName: cols[3]?.trim() || undefined,
      maidenName: cols[4]?.trim() || undefined,
      gender: genderRaw === 'ж' || genderRaw === 'female' || genderRaw === 'f' ? 'female' : 'male',
      birthDate: cols[6]?.trim() || undefined,
      isLiving,
      deathDate,
      birthPlace: cols[9]?.trim() || undefined,
      residence: cols[10]?.trim() || undefined,
      profession: cols[11]?.trim() || undefined,
      bio: cols[12]?.trim() || undefined,
      facts: cols[13]
        ? cols[13]
            .split('|')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      gallery: [],
      parentIds: cols[14]
        ? cols[14]
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      spouseIds: cols[15]
        ? cols[15]
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      childIds: cols[16]
        ? cols[16]
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    };
  }

  if (Object.keys(members).length === 0) {
    throw new Error('Не удалось распознать записи в CSV-файле.');
  }

  return {
    familyName: 'Импортированное древо',
    anchorPersonId: Object.keys(members)[0],
    members: normalizeRelations(members),
  };
}

function parseCsvRows(text: string): string[][] {
  // Detect delimiter (; vs ,) from first line
  const firstLineEnd = text.indexOf('\n');
  const firstLine = firstLineEnd >= 0 ? text.slice(0, firstLineEnd) : text;
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentCell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentCell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        currentRow.push(currentCell);
        currentCell = '';
      } else if (ch === '\r' && next === '\n') {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i++;
      } else if (ch === '\n') {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += ch;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}
