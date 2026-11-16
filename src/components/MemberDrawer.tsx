import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Briefcase,
  Calendar,
  Camera,
  Check,
  FileText,
  Heart,
  ImagePlus,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { FamilyMember, GalleryItem, Gender, RelationType } from '../types/family';
import {
  calculateAge,
  extractYear,
  formatStoredDate,
  parseDate,
  formatFullName,
  formatRussianDate,
  generateId,
  pluralizeYears,
  resizeImageToDataUrl,
} from '../utils/dateUtils';
import { DateFields } from './DateFields';

/** Stores readable dates in one unambiguous form; keeps unreadable text as typed. */
function normalizeDate(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return formatStoredDate(parseDate(trimmed)) ?? trimmed;
}
import { GenderAvatar } from './GenderAvatar';

interface MemberDrawerProps {
  member: FamilyMember | null;
  allMembers: Record<string, FamilyMember>;
  onClose: () => void;
  onUpdateMember: (updated: FamilyMember) => void;
  onDeleteMember: (memberId: string) => void;
  onSelectRelative: (memberId: string) => void;
  onOpenAddRelation: (targetMemberId: string, relation: RelationType) => void;
  onUnlinkRelation: (memberId: string, otherId: string, relation: RelationType) => void;
  onOpenLightbox: (item: GalleryItem) => void;
  canEdit: boolean;
}

export const MemberDrawer: React.FC<MemberDrawerProps> = ({
  member,
  allMembers,
  onClose,
  onUpdateMember,
  onDeleteMember,
  onSelectRelative,
  onOpenAddRelation,
  onUnlinkRelation,
  onOpenLightbox,
  canEdit,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState<FamilyMember | null>(null);
  const [newFact, setNewFact] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Gallery upload modal mini-state
  const [pendingGalleryFile, setPendingGalleryFile] = useState<string | null>(null);
  const [galleryTitle, setGalleryTitle] = useState('');
  const [galleryDate, setGalleryDate] = useState('');
  const [galleryKind, setGalleryKind] = useState<'photo' | 'document'>('photo');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const cloneMember = (m: FamilyMember): FamilyMember => ({
    ...m,
    facts: [...(m.facts || [])],
    gallery: [...(m.gallery || [])],
  });

  // Reset all local UI state only when a different person is opened.
  // (Previously this ran on every update of the same person, e.g. after adding
  // a gallery photo or relative, and silently discarded unsaved edits.)
  const memberId = member?.id ?? null;
  useEffect(() => {
    setIsEditing(false);
    setConfirmDelete(false);
    setUploadError(null);
    setPendingGalleryFile(null);
    setNewFact('');
  }, [memberId]);

  // Keep the draft in sync with stored data while not editing.
  useEffect(() => {
    if (!member) {
      setDraft(null);
    } else if (!isEditing) {
      setDraft(cloneMember(member));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member, isEditing]);

  // When switching to another person while in edit mode, take that person's data.
  useEffect(() => {
    if (member) setDraft(cloneMember(member));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  // Leaving edit mode (logout or expired password) closes the form.
  useEffect(() => {
    if (!canEdit) {
      setIsEditing(false);
      setPendingGalleryFile(null);
      setConfirmDelete(false);
    }
  }, [canEdit]);

  const cancelEdit = () => {
    if (member) setDraft(cloneMember(member));
    setIsEditing(false);
  };

  if (!member || !draft) return null;

  const current = isEditing ? draft : member;
  const age = calculateAge(current.birthDate, current.deathDate, current.isLiving);

  const parents = member.parentIds.map((id) => allMembers[id]).filter(Boolean);
  const spouses = member.spouseIds.map((id) => allMembers[id]).filter(Boolean);
  const children = member.childIds.map((id) => allMembers[id]).filter(Boolean);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const dataUrl = await resizeImageToDataUrl(file, 520, 0.84);
      const updated = { ...draft, avatar: dataUrl };
      setDraft(updated);
      if (!isEditing) {
        onUpdateMember(updated);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Ошибка загрузки изображения.');
    } finally {
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    const updated = { ...draft, avatar: undefined };
    setDraft(updated);
    if (!isEditing) {
      onUpdateMember(updated);
    }
  };

  const handleGalleryFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const dataUrl = await resizeImageToDataUrl(file, 960, 0.82);
      setPendingGalleryFile(dataUrl);
      setGalleryTitle(file.name.replace(/\.[^/.]+$/, ''));
      setGalleryDate('');
      setGalleryKind('photo');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Ошибка загрузки файла.');
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmAddGallery = () => {
    if (!pendingGalleryFile) return;
    const item: GalleryItem = {
      id: generateId('gal'),
      title: galleryTitle.trim() || 'Семейный снимок',
      date: galleryDate.trim() || undefined,
      dataUrl: pendingGalleryFile,
      kind: galleryKind,
    };
    // Persist only the gallery change on top of stored data, so unsaved
    // form edits are not saved implicitly; keep them in the draft.
    const nextGallery = [...(member.gallery || []), item];
    onUpdateMember({ ...member, gallery: nextGallery });
    setDraft({ ...draft, gallery: nextGallery });
    setPendingGalleryFile(null);
    setGalleryTitle('');
    setGalleryDate('');
  };

  const handleDeleteGalleryItem = (itemId: string) => {
    const nextGallery = (member.gallery || []).filter((g) => g.id !== itemId);
    onUpdateMember({ ...member, gallery: nextGallery });
    setDraft({ ...draft, gallery: nextGallery });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.firstName.trim()) return;
    const cleanedFacts = draft.facts.map((f) => f.trim()).filter(Boolean);
    onUpdateMember({
      ...draft,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      middleName: draft.middleName?.trim() || undefined,
      maidenName: draft.maidenName?.trim() || undefined,
      birthPlace: draft.birthPlace?.trim() || undefined,
      residence: draft.residence?.trim() || undefined,
      profession: draft.profession?.trim() || undefined,
      bio: draft.bio?.trim() || undefined,
      birthDate: normalizeDate(draft.birthDate),
      deathDate: draft.isLiving ? undefined : normalizeDate(draft.deathDate),
      facts: cleanedFacts,
    });
    setIsEditing(false);
  };

  const addFactToDraft = () => {
    const trimmed = newFact.trim();
    if (!trimmed) return;
    setDraft({ ...draft, facts: [...draft.facts, trimmed] });
    setNewFact('');
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#26221E]/30 backdrop-blur-[2px] transition-opacity"
        aria-hidden="true"
      />

      {/* Slide-over Panel */}
      <aside
        aria-label="Карточка члена семьи"
        className="relative z-50 w-full sm:w-[540px] max-w-full h-full bg-[#FAF8F5] border-l border-[#E6E0D5] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Drawer Sticky Top Action Bar */}
        <div className="bg-white/95 backdrop-blur-xs border-b border-[#E6E0D5] px-5 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-[#8A8175]">
            {isEditing ? 'Редактирование карточки' : 'Страница альбома'}
          </div>
          <div className="flex items-center gap-2">
            {!canEdit ? null : !isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6E0D5] bg-white hover:bg-[#FAF8F5] text-xs font-medium text-[#26221E] transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-[#2D5A4C]" />
                <span>Редактировать</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-3 py-1.5 rounded-lg border border-[#E6E0D5] bg-white hover:bg-[#FAF8F5] text-xs font-medium text-[#5E574E] transition-colors cursor-pointer"
              >
                Отмена
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#5E574E] hover:bg-[#F3EFE8] hover:text-[#26221E] transition-colors cursor-pointer"
              aria-label="Закрыть карточку"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-6 space-y-7">
          {uploadError && (
            <div className="px-4 py-3 rounded-xl bg-[#F6EAE4] border border-[#E2BFB1] text-xs text-[#9A3412]">
              {uploadError}
            </div>
          )}

          {/* Avatar + Primary Identity */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="relative group shrink-0">
              <GenderAvatar
                src={current.avatar}
                gender={current.gender}
                alt={formatFullName(current)}
                size="xl"
              />
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className={`${canEdit ? "flex" : "hidden"} absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-[#2D5A4C] hover:bg-[#23473C] text-white shadow-md items-center justify-center transition-colors cursor-pointer border-2 border-[#FAF8F5]`}
                title="Загрузить фотографию"
                aria-label="Загрузить фотографию"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left min-w-0">
              <h2 className="font-display text-3xl font-semibold text-[#26221E] leading-tight text-balance">
                {formatFullName(current)}
              </h2>
              {current.maidenName && (
                <p className="text-sm text-[#5E574E] mt-1">
                  Девичья фамилия: <span className="font-medium text-[#26221E]">{current.maidenName}</span>
                </p>
              )}

              {/* Clean unboxed lifespan & age metadata */}
              <div className="mt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-x-2.5 gap-y-1 text-sm text-[#5E574E] tabular-nums">
                {current.birthDate && (
                  <span>
                    {current.gender === 'female' ? 'Род.' : 'Род.'} {formatRussianDate(current.birthDate)}
                  </span>
                )}
                {!current.isLiving && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      {current.deathDate
                        ? `Ушла из жизни ${formatRussianDate(current.deathDate)}`.replace(
                            'Ушла',
                            current.gender === 'female' ? 'Ушла' : 'Ушёл'
                          )
                        : current.gender === 'female'
                          ? 'Ушла из жизни'
                          : 'Ушёл из жизни'}
                    </span>
                  </>
                )}
                {current.isLiving && (
                  <>
                    {current.birthDate && <span aria-hidden="true">·</span>}
                    <span className="text-[#2D5A4C] font-medium">
                      {current.gender === 'female' ? 'Жива' : 'Жив'}
                    </span>
                  </>
                )}
                {age !== null && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{pluralizeYears(age)}</span>
                  </>
                )}
              </div>

              {canEdit && current.avatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="mt-2 text-xs text-[#8A8175] hover:text-[#B85D3B] underline underline-offset-2 cursor-pointer"
                >
                  Убрать фото и показать силуэт
                </button>
              )}
            </div>
          </div>

          {/* Quick Relationship Action Bar */}
          {canEdit && !isEditing && (
            <div className="bg-white border border-[#E6E0D5] rounded-xl p-4">
              <div className="text-xs font-medium text-[#8A8175] mb-3">
                Быстрое добавление связей в древо
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onOpenAddRelation(member.id, 'parent')}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#FAF8F5] hover:bg-[#E9EFEA] border border-[#E6E0D5] hover:border-[#2D5A4C]/30 text-xs font-medium text-[#26221E] hover:text-[#2D5A4C] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#2D5A4C] shrink-0" />
                  <span>Добавить родителя</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAddRelation(member.id, 'spouse')}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#FAF8F5] hover:bg-[#F6EAE4] border border-[#E6E0D5] hover:border-[#B85D3B]/30 text-xs font-medium text-[#26221E] hover:text-[#B85D3B] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Heart className="w-3.5 h-3.5 text-[#B85D3B] shrink-0" />
                  <span>Добавить супруга/у</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAddRelation(member.id, 'child')}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#FAF8F5] hover:bg-[#E9EFEA] border border-[#E6E0D5] hover:border-[#2D5A4C]/30 text-xs font-medium text-[#26221E] hover:text-[#2D5A4C] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 text-[#2D5A4C] shrink-0" />
                  <span>Добавить ребенка</span>
                </button>
              </div>
            </div>
          )}

          {/* EDIT FORM OR READ-ONLY EDITORIAL BIO */}
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-5 bg-white border border-[#E6E0D5] rounded-xl p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#5E574E] mb-1">Фамилия</label>
                  <input
                    type="text"
                    value={draft.lastName}
                    onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#FAF8F5] border border-[#E6E0D5] rounded-lg focus:outline-none focus:border-[#2D5A4C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5E574E] mb-1">
                    Имя <span className="text-[#B85D3B]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={draft.firstName}
                    onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#FAF8F5] border border-[#E6E0D5] rounded-lg focus:outline-none focus:border-[#2D5A4C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5E574E] mb-1">Отчество</label>
                  <input
                    type="text"
                    value={draft.middleName ?? ''}
                    onChange={(e) => setDraft({ ...draft, middleName: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#FAF8F5] border border-[#E6E0D5] rounded-lg focus:outline-none focus:border-[#2D5A4C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5E574E] mb-1">Девичья фамилия</label>
                  <input
                    type="text"
                    value={draft.maidenName ?? ''}
                    onChange={(e) => setDraft({ ...draft, maidenName: e.target.value })}
                    placeholder="Если менялась"
                    className="w-full px-3 py-2 text-sm bg-[#FAF8F5] border border-[#E6E0D5] rounded-lg focus:outline-none focus:border-[#2D5A4C]"
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <span className="block text-xs font-medium text-[#5E574E] mb-1.5">Пол</span>
                <div className="inline-flex p-1 bg-[#F3EFE8] rounded-lg border border-[#E6E0D5]">
                  {(
                    [
                      { val: 'male', label: 'Мужской' },
                      { val: 'female', label: 'Женский' },
                    ] as { val: Gender; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setDraft({ ...draft, gender: opt.val })}
                      className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        draft.gender === opt.val
                          ? 'bg-white text-[#2D5A4C] shadow-xs'
                          : 'text-[#5E574E] hover:text-[#26221E]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates & Living status */}
              <div className="space-y-3">
                <DateFields
                  key={`birth-${member.id}`}
                  label="Дата рождения (можно только год)"
                  tone="paper"
                  value={draft.birthDate}
                  onChange={(v) => setDraft((d) => (d ? { ...d, birthDate: v } : d))}
                />

                <label className="flex items-center gap-2.5 py-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={draft.isLiving}
                    onChange={(e) => setDraft({ ...draft, isLiving: e.target.checked })}
                    className="w-4 h-4 accent-[#2D5A4C] rounded cursor-pointer"
                  />
                  <span className="text-sm text-[#26221E]">
                    {draft.gender === 'female' ? 'Жива в настоящее время' : 'Жив в настоящее время'}
                  </span>
                </label>

                {!draft.isLiving && (
                  <DateFields
                    key={`death-${member.id}`}
                    label="Дата смерти (можно только год)"
                    tone="paper"
                    value={draft.deathDate}
                    onChange={(v) => setDraft((d) => (d ? { ...d, deathDate: v } : d))}
                  />
                )}
              </div>

              {/* Places & Profession */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#5E574E] mb-1">Место рождения</label>
                  <input
                    type="text"
                    value={draft.birthPlace ?? ''}
                    onChange={(e) => setDraft({ ...draft, birthPlace: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#FAF8F5] border border-[#E6E0D5] rounded-lg focus:outline-none focus:border-[#2D5A4C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5E574E] mb-1">Место проживания</label>
                  <input
                    type="text"
                    value={draft.residence ?? ''}
                    onChange={(e) => setDraft({ ...draft, residence: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#FAF8F5] border border-[#E6E0D5] rounded-lg focus:outline-none focus:border-[#2D5A4C]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#5E574E] mb-1">Профессия / дело жизни</label>
                  <input
                    type="text"
                    value={draft.profession ?? ''}
                    onChange={(e) => setDraft({ ...draft, profession: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#FAF8F5] border border-[#E6E0D5] rounded-lg focus:outline-none focus:border-[#2D5A4C]"
                  />
                </div>
              </div>

              {/* Biography */}
              <div>
                <label className="block text-xs font-medium text-[#5E574E] mb-1">Короткая биография</label>
                <textarea
                  rows={4}
                  value={draft.bio ?? ''}
                  onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                  placeholder="Расскажите о жизненном пути, характере и главных событиях..."
                  className="w-full px-3 py-2 text-sm bg-[#FAF8F5] border border-[#E6E0D5] rounded-lg focus:outline-none focus:border-[#2D5A4C] leading-relaxed"
                />
              </div>

              {/* Facts & Stories */}
              <div>
                <label className="block text-xs font-medium text-[#5E574E] mb-1.5">
                  Интересные факты и семейные истории
                </label>
                <div className="space-y-2 mb-2.5">
                  {draft.facts.map((fact, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <input
                        type="text"
                        value={fact}
                        onChange={(e) => {
                          const next = [...draft.facts];
                          next[idx] = e.target.value;
                          setDraft({ ...draft, facts: next });
                        }}
                        className="flex-1 px-3 py-1.5 text-sm bg-[#FAF8F5] border border-[#E6E0D5] rounded-lg focus:outline-none focus:border-[#2D5A4C]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            facts: draft.facts.filter((_, i) => i !== idx),
                          })
                        }
                        className="p-2 text-[#8A8175] hover:text-[#B85D3B] cursor-pointer"
                        aria-label="Удалить факт"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFact}
                    onChange={(e) => setNewFact(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addFactToDraft();
                      }
                    }}
                    placeholder="Добавить новую историю или факт..."
                    className="flex-1 px-3 py-2 text-sm bg-[#FAF8F5] border border-[#E6E0D5] rounded-lg focus:outline-none focus:border-[#2D5A4C]"
                  />
                  <button
                    type="button"
                    onClick={addFactToDraft}
                    className="px-3 py-2 rounded-lg bg-[#F3EFE8] hover:bg-[#E6E0D5] text-xs font-medium text-[#26221E] cursor-pointer whitespace-nowrap"
                  >
                    Добавить
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#F3EFE8]">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 rounded-lg border border-[#E6E0D5] text-sm font-medium text-[#5E574E] hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#2D5A4C] hover:bg-[#23473C] text-white text-sm font-medium cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Сохранить изменения</span>
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Clean Accession Details List */}
              <div className="bg-white border border-[#E6E0D5] rounded-xl divide-y divide-[#F3EFE8]">
                {(member.birthPlace || member.residence) && (
                  <div className="px-4 py-3.5 flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-[#8A8175] mt-0.5 shrink-0" />
                    <div className="text-sm space-y-1">
                      {member.birthPlace && (
                        <div>
                          <span className="text-[#8A8175]">Место рождения: </span>
                          <span className="text-[#26221E] font-medium">{member.birthPlace}</span>
                        </div>
                      )}
                      {member.residence && (
                        <div>
                          <span className="text-[#8A8175]">Проживание: </span>
                          <span className="text-[#26221E] font-medium">{member.residence}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {member.profession && (
                  <div className="px-4 py-3.5 flex items-start gap-3">
                    <Briefcase className="w-4 h-4 text-[#8A8175] mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <span className="text-[#8A8175]">Профессия: </span>
                      <span className="text-[#26221E] font-medium">{member.profession}</span>
                    </div>
                  </div>
                )}

                {member.birthDate && (
                  <div className="px-4 py-3.5 flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-[#8A8175] mt-0.5 shrink-0" />
                    <div className="text-sm tabular-nums">
                      <span className="text-[#8A8175]">Даты жизни: </span>
                      <span className="text-[#26221E] font-medium">
                        {formatRussianDate(member.birthDate)}
                        {member.isLiving
                          ? ' — н.в.'
                          : member.deathDate
                            ? ` — ${formatRussianDate(member.deathDate)}`
                            : ''}
                      </span>
                    </div>
                  </div>
                )}

                {!member.birthPlace && !member.residence && !member.profession && !member.birthDate && (
                  <div className="px-4 py-4 text-sm text-[#8A8175]">
                    Подробные сведения пока не заполнены. Нажмите «Редактировать», чтобы добавить даты и места.
                  </div>
                )}
              </div>

              {/* Biography */}
              {member.bio && (
                <div>
                  <h3 className="font-display text-xl font-semibold text-[#26221E] mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#2D5A4C]" />
                    <span>Биография</span>
                  </h3>
                  <p className="text-[15px] text-[#26221E]/90 leading-[1.68] whitespace-pre-line">
                    {member.bio}
                  </p>
                </div>
              )}

              {/* Interesting Facts & Stories */}
              {member.facts && member.facts.length > 0 && (
                <div>
                  <h3 className="font-display text-xl font-semibold text-[#26221E] mb-2.5">
                    Интересные факты и семейные истории
                  </h3>
                  <ul className="space-y-2.5">
                    {member.facts.map((fact, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 text-sm text-[#26221E] leading-relaxed bg-white border border-[#E6E0D5] rounded-xl px-4 py-3"
                      >
                        <span className="font-display text-base font-semibold text-[#B85D3B] tabular-nums shrink-0">
                          {String(index + 1).padStart(2, '0')}.
                        </span>
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Family Connections List */}
          <div>
            <h3 className="font-display text-xl font-semibold text-[#26221E] mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#2D5A4C]" />
              <span>Родственные связи</span>
            </h3>

            {parents.length === 0 && spouses.length === 0 && children.length === 0 ? (
              <p className="text-sm text-[#8A8175]">
                Связи пока не указаны. Воспользуйтесь кнопками выше, чтобы добавить родителей, супруга или детей.
              </p>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Родители', items: parents, rel: 'parent' as RelationType },
                  { label: 'Супруг(а)', items: spouses, rel: 'spouse' as RelationType },
                  { label: 'Дети', items: children, rel: 'child' as RelationType },
                ]
                  .filter((g) => g.items.length > 0)
                  .map((group) => (
                    <div key={group.label}>
                      <div className="text-xs font-medium text-[#8A8175] mb-1.5">{group.label}</div>
                      <div className="space-y-1.5">
                        {group.items.map((relMember) => (
                          <div
                            key={relMember.id}
                            className="flex items-center justify-between gap-2 bg-white border border-[#E6E0D5] rounded-xl px-3 py-2 hover:border-[#CFC6B8] transition-colors"
                          >
                            <button
                              type="button"
                              onClick={() => onSelectRelative(relMember.id)}
                              className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                            >
                              <GenderAvatar
                                src={relMember.avatar}
                                gender={relMember.gender}
                                alt={formatFullName(relMember)}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-[#26221E] truncate hover:text-[#2D5A4C]">
                                  {formatFullName(relMember)}
                                </div>
                                <div className="text-xs text-[#8A8175] tabular-nums">
                                  {extractYear(relMember.birthDate) ?? '—'}
                                  {!relMember.isLiving && relMember.deathDate
                                    ? ` — ${extractYear(relMember.deathDate) ?? '?'}`
                                    : ''}
                                </div>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => onUnlinkRelation(member.id, relMember.id, group.rel)}
                              className={`${canEdit ? '' : 'hidden'} p-1.5 text-[#8A8175] hover:text-[#B85D3B] rounded-md cursor-pointer`}
                              title="Убрать связь"
                              aria-label={`Убрать связь с ${relMember.firstName}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Photo & Document Gallery */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-display text-xl font-semibold text-[#26221E]">
                Фотоархив и документы
              </h3>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleGalleryFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className={`${canEdit ? 'inline-flex' : 'hidden'} items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6E0D5] bg-white hover:bg-[#FAF8F5] text-xs font-medium text-[#2D5A4C] transition-colors cursor-pointer`}
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span>Добавить фото / документ</span>
              </button>
            </div>

            {pendingGalleryFile && (
              <div className="mb-4 bg-white border border-[#2D5A4C]/40 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <img
                    src={pendingGalleryFile}
                    alt="Предпросмотр"
                    className="w-20 h-20 object-cover rounded-lg border border-[#E6E0D5] shrink-0"
                  />
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={galleryTitle}
                      onChange={(e) => setGalleryTitle(e.target.value)}
                      placeholder="Название или подпись (например: Письмо 1968 года)"
                      className="w-full px-3 py-1.5 text-sm bg-[#FAF8F5] border border-[#E6E0D5] rounded-lg focus:outline-none focus:border-[#2D5A4C]"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={galleryDate}
                        onChange={(e) => setGalleryDate(e.target.value)}
                        placeholder="Год / дата"
                        className="px-3 py-1.5 text-xs bg-[#FAF8F5] border border-[#E6E0D5] rounded-lg focus:outline-none focus:border-[#2D5A4C]"
                      />
                      <select
                        value={galleryKind}
                        onChange={(e) => setGalleryKind(e.target.value as 'photo' | 'document')}
                        className="px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#E6E0D5] rounded-lg focus:outline-none focus:border-[#2D5A4C]"
                      >
                        <option value="photo">Фотография</option>
                        <option value="document">Документ / письмо</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingGalleryFile(null)}
                    className="px-3 py-1.5 text-xs text-[#5E574E] hover:text-[#26221E] cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAddGallery}
                    className="px-3.5 py-1.5 rounded-lg bg-[#2D5A4C] text-white text-xs font-medium hover:bg-[#23473C] cursor-pointer"
                  >
                    Сохранить в альбом
                  </button>
                </div>
              </div>
            )}

            {member.gallery && member.gallery.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {member.gallery.map((item) => (
                  <div
                    key={item.id}
                    className="group relative bg-white border border-[#E6E0D5] rounded-xl overflow-hidden shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenLightbox(item)}
                      className="block w-full text-left cursor-pointer"
                    >
                      <div className="aspect-4/3 bg-[#F3EFE8] overflow-hidden">
                        <img
                          src={item.dataUrl}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        />
                      </div>
                      <div className="p-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-[#26221E] truncate">
                          {item.kind === 'document' && (
                            <FileText className="w-3.5 h-3.5 text-[#B85D3B] shrink-0" />
                          )}
                          <span className="truncate">{item.title}</span>
                        </div>
                        {item.date && (
                          <div className="text-[11px] text-[#8A8175] mt-0.5 tabular-nums">{item.date}</div>
                        )}
                      </div>
                    </button>
                    {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleDeleteGalleryItem(item.id)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 text-[#5E574E] hover:text-[#B85D3B] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs cursor-pointer"
                      aria-label="Удалить из галереи"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-dashed border-[#D6CEBE] rounded-xl p-5 text-center text-xs text-[#8A8175]">
                Здесь можно хранить старые фотографии, письма, свидетельства и другие семейные документы.
              </div>
            )}
          </div>

          {/* Danger Zone: Delete Member */}
          <div className={`${canEdit ? '' : 'hidden'} pt-4 border-t border-[#E6E0D5]`}>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8A8175] hover:text-[#B85D3B] transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Удалить этого человека из древа</span>
              </button>
            ) : (
              <div className="bg-[#F6EAE4] border border-[#E2BFB1] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-[#7C2D12]">
                  Удалить «{formatFullName(member)}» без возможности отмены?
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-[#E6E0D5] text-xs font-medium text-[#26221E] cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteMember(member.id)}
                    className="px-3 py-1.5 rounded-lg bg-[#B85D3B] hover:bg-[#9A4A2D] text-white text-xs font-medium cursor-pointer"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};
