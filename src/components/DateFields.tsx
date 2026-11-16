import React, { useEffect, useId, useRef, useState } from 'react';
import { formatStoredDate, MONTHS_NOMINATIVE, parseDate } from '../utils/dateUtils';

interface DateFieldsProps {
  label: string;
  /** Stored value: "YYYY", "YYYY-MM-DD", or an older free-form string */
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  /** Background of the inputs, to match the surrounding form */
  tone?: 'white' | 'paper';
}

interface Fields {
  day: string;
  month: string;
  year: string;
}

function toFields(value: string | undefined): Fields {
  const p = parseDate(value);
  if (!p) return { day: '', month: '', year: '' };
  return {
    day: p.day ? String(p.day) : '',
    month: p.month ? String(p.month) : '',
    year: String(p.year),
  };
}

/** Result of the three fields: the value to store, or a hint why it can't be saved yet. */
function fromFields(f: Fields): { value: string | undefined; hint: string | null } {
  const hasDay = f.day !== '';
  const hasMonth = f.month !== '';
  const year = f.year.trim();

  if (!year) {
    if (!hasDay && !hasMonth) return { value: undefined, hint: null };
    return { value: undefined, hint: 'Укажите год — без него дата не сохранится.' };
  }
  if (!/^\d{4}$/.test(year) || +year < 1000 || +year > 2999) {
    return { value: undefined, hint: 'Год — это четыре цифры, например 1985.' };
  }
  if (hasDay !== hasMonth) {
    return {
      value: String(+year),
      hint: hasDay ? 'Выберите и месяц — пока сохранится только год.' : 'Выберите и день — пока сохранится только год.',
    };
  }
  if (!hasDay) return { value: String(+year), hint: null };

  const day = +f.day;
  const month = +f.month;
  const maxDay = new Date(+year, month, 0).getDate();
  if (day > maxDay) {
    return { value: String(+year), hint: `В этом месяце только ${maxDay} дней.` };
  }
  return { value: formatStoredDate({ year: +year, month, day }), hint: null };
}

/**
 * Date input as three fields (day, month, year) so dates are always stored
 * unambiguously. Year alone is fine; day and month are optional.
 */
export const DateFields: React.FC<DateFieldsProps> = ({ label, value, onChange, tone = 'white' }) => {
  const id = useId();
  const [fields, setFields] = useState<Fields>(() => toFields(value));
  const lastEmitted = useRef<string | undefined>(value);

  // An old free-form value we couldn't read — show it, so nothing is lost silently.
  const unreadable = value && !parseDate(value) ? value : null;

  // Follow outside changes (e.g. the form was reset), but not our own updates.
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setFields(toFields(value));
    }
  }, [value]);

  const update = (patch: Partial<Fields>) => {
    const next = { ...fields, ...patch };
    setFields(next);
    const { value: stored } = fromFields(next);
    if (stored !== lastEmitted.current) {
      lastEmitted.current = stored;
      onChange(stored);
    }
  };

  const { hint } = fromFields(fields);
  const bg = tone === 'paper' ? 'bg-[#FAF8F5]' : 'bg-white';
  const control = `${bg} border border-[#E6E0D5] rounded-lg px-2.5 py-2 text-sm tabular-nums focus:outline-none focus:border-[#2D5A4C]`;

  return (
    <fieldset>
      <legend className="block text-xs font-medium text-[#5E574E] mb-1">{label}</legend>
      <div className="grid grid-cols-[4.5rem_1fr_5rem] gap-2">
        <select
          id={`${id}-day`}
          aria-label={`${label}: день`}
          value={fields.day}
          onChange={(e) => update({ day: e.target.value })}
          className={`${control} cursor-pointer`}
        >
          <option value="">День</option>
          {Array.from({ length: 31 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
        <select
          aria-label={`${label}: месяц`}
          value={fields.month}
          onChange={(e) => update({ month: e.target.value })}
          className={`${control} cursor-pointer min-w-0`}
        >
          <option value="">Месяц</option>
          {MONTHS_NOMINATIVE.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          aria-label={`${label}: год`}
          placeholder="Год"
          value={fields.year}
          onChange={(e) => update({ year: e.target.value.replace(/\D/g, '') })}
          className={`${control} min-w-0`}
        />
      </div>
      {hint && <p className="mt-1 text-[11px] text-[#B85D3B]">{hint}</p>}
      {!hint && unreadable && (
        <p className="mt-1 text-[11px] text-[#8A8175]">
          Сейчас записано: «{unreadable}». Заполните поля, чтобы указать дату точнее.
        </p>
      )}
    </fieldset>
  );
};
