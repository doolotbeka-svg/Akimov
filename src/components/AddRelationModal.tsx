import React, { useMemo, useRef, useState } from 'react';
import { Camera, Link2, UserPlus, X } from 'lucide-react';
import { FamilyMember, Gender, RelationType } from '../types/family';
import { formatFullName, generateId, resizeImageToDataUrl } from '../utils/dateUtils';
import { GenderAvatar } from './GenderAvatar';

interface AddRelationModalProps {
  isOpen: boolean;
  targetMember: FamilyMember | null;
  relationType: RelationType | null;
  allMembers: Record<string, FamilyMember>;
  onClose: () => void;
  onCreateMember: (
    newMember: FamilyMember,
    linkTo?: { targetId: string; relation: RelationType; alsoLinkSpouseId?: string }
  ) => void;
  onLinkExisting: (targetId: string, existingId: string, relation: RelationType) => void;
}

const RELATION_TITLES: Record<RelationType, string> = {
  parent: 'Добавить родителя',
  spouse: 'Добавить супруга / супругу',
  child: 'Добавить ребёнка',
};

export const AddRelationModal: React.FC<AddRelationModalProps> = ({
  isOpen,
  targetMember,
  relationType,
  allMembers,
  onClose,
  onCreateMember,
  onLinkExisting,
}) => {
  const [mode, setMode] = useState<'create' | 'existing'>('create');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState(() =>
    targetMember && relationType === 'child' ? targetMember.lastName : ''
  );
  const [middleName, setMiddleName] = useState('');
  const [maidenName, setMaidenName] = useState('');
  const [gender, setGender] = useState<Gender>(() => {
    if (targetMember && relationType === 'spouse') {
      return targetMember.gender === 'male' ? 'female' : 'male';
    }
    return 'male';
  });
  const [birthDate, setBirthDate] = useState('');
  const [isLiving, setIsLiving] = useState(true);
  const [deathDate, setDeathDate] = useState('');
  const [profession, setProfession] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [selectedExistingId, setSelectedExistingId] = useState('');
  const [alsoLinkSecondParent, setAlsoLinkSecondParent] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const linkableCandidates = useMemo(() => {
    if (!targetMember || !relationType) return [];
    const excluded = new Set([
      targetMember.id,
      ...targetMember.parentIds,
      ...targetMember.spouseIds,
      ...targetMember.childIds,
    ]);
    return Object.values(allMembers).filter((m) => !excluded.has(m.id));
  }, [allMembers, targetMember, relationType]);

  if (!isOpen) return null;

  const targetSpouse =
    targetMember && relationType === 'child' && targetMember.spouseIds.length > 0
      ? allMembers[targetMember.spouseIds[0]]
      : undefined;

  const title =
    targetMember && relationType
      ? `${RELATION_TITLES[relationType]} для ${targetMember.firstName}`
      : 'Добавить человека в древо';

  const handlePhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataUrl(file, 520, 0.84);
      setAvatar(dataUrl);
    } catch {
      // Ignore invalid image silently
    } finally {
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'existing' && targetMember && relationType) {
      if (!selectedExistingId) return;
      onLinkExisting(targetMember.id, selectedExistingId, relationType);
      onClose();
      return;
    }

    if (!firstName.trim()) return;

    const newMember: FamilyMember = {
      id: generateId('m'),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      middleName: middleName.trim() || undefined,
      maidenName: maidenName.trim() || undefined,
      gender,
      avatar,
      birthDate: birthDate.trim() || undefined,
      isLiving,
      deathDate: isLiving ? undefined : deathDate.trim() || undefined,
      profession: profession.trim() || undefined,
      birthPlace: birthPlace.trim() || undefined,
      facts: [],
      gallery: [],
      parentIds: [],
      spouseIds: [],
      childIds: [],
    };

    onCreateMember(
      newMember,
      targetMember && relationType
        ? {
            targetId: targetMember.id,
            relation: relationType,
            alsoLinkSpouseId:
              relationType === 'child' && alsoLinkSecondParent && targetSpouse
                ? targetSpouse.id
                : undefined,
          }
        : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#26221E]/35 backdrop-blur-[2px]"
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-lg bg-[#FAF8F5] border border-[#E6E0D5] rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-[#E6E0D5] flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold text-[#26221E]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#5E574E] hover:bg-[#F3EFE8] cursor-pointer"
            aria-label="Закрыть окно"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switch when adding relative to someone */}
        {targetMember && relationType && linkableCandidates.length > 0 && (
          <div className="px-6 pt-4">
            <div className="inline-flex w-full p-1 bg-[#F3EFE8] rounded-lg border border-[#E6E0D5]">
              <button
                type="button"
                onClick={() => setMode('create')}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  mode === 'create' ? 'bg-white text-[#2D5A4C] shadow-xs' : 'text-[#5E574E]'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Создать нового</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('existing')}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  mode === 'existing' ? 'bg-white text-[#2D5A4C] shadow-xs' : 'text-[#5E574E]'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Связать с существующим</span>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {mode === 'existing' && targetMember && relationType ? (
            <div className="space-y-4">
              <p className="text-sm text-[#5E574E]">
                Выберите человека из уже добавленных в древо, чтобы указать родственную связь:
              </p>
              <select
                value={selectedExistingId}
                onChange={(e) => setSelectedExistingId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E6E0D5] rounded-xl focus:outline-none focus:border-[#2D5A4C]"
              >
                <option value="">— Выберите человека —</option>
                {linkableCandidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {formatFullName(c)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              {/* Avatar Upload */}
              <div className="flex items-center gap-4">
                <GenderAvatar src={avatar} gender={gender} alt="Аватар" size="lg" />
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoPick}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E6E0D5] hover:bg-[#F3EFE8] text-xs font-medium text-[#26221E] cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#2D5A4C]" />
                    <span>{avatar ? 'Изменить фото' : 'Загрузить фото'}</span>
                  </button>
                  <p className="text-[11px] text-[#8A8175] mt-1">
                    Если фото нет, будет показан аккуратный силуэт по полу.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#5E574E] mb-1">Фамилия</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Акимов"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E6E0D5] rounded-lg focus:outline-none focus:border-[#2D5A4C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5E574E] mb-1">
                    Имя <span className="text-[#B85D3B]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Айбек"
                    autoFocus
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E6E0D5] rounded-lg focus:outline-none focus:border-[#2D5A4C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5E574E] mb-1">Отчество</label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="Байназарович"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E6E0D5] rounded-lg focus:outline-none focus:border-[#2D5A4C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5E574E] mb-1">Девичья фамилия</label>
                  <input
                    type="text"
                    value={maidenName}
                    onChange={(e) => setMaidenName(e.target.value)}
                    placeholder="Если менялась"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E6E0D5] rounded-lg focus:outline-none focus:border-[#2D5A4C]"
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
                      onClick={() => setGender(opt.val)}
                      className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        gender === opt.val
                          ? 'bg-white text-[#2D5A4C] shadow-xs'
                          : 'text-[#5E574E] hover:text-[#26221E]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
                <div>
                  <label className="block text-xs font-medium text-[#5E574E] mb-1">
                    Дата рождения (год или ГГГГ-ММ-ДД)
                  </label>
                  <input
                    type="text"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    placeholder="1985"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E6E0D5] rounded-lg tabular-nums focus:outline-none focus:border-[#2D5A4C]"
                  />
                </div>
                <label className="flex items-center gap-2 py-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isLiving}
                    onChange={(e) => setIsLiving(e.target.checked)}
                    className="w-4 h-4 accent-[#2D5A4C] cursor-pointer"
                  />
                  <span className="text-sm text-[#26221E]">Жив(а) в настоящее время</span>
                </label>
                {!isLiving && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#5E574E] mb-1">Дата смерти</label>
                    <input
                      type="text"
                      value={deathDate}
                      onChange={(e) => setDeathDate(e.target.value)}
                      placeholder="2020"
                      className="w-full px-3 py-2 text-sm bg-white border border-[#E6E0D5] rounded-lg tabular-nums focus:outline-none focus:border-[#2D5A4C]"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#5E574E] mb-1">Место рождения</label>
                  <input
                    type="text"
                    value={birthPlace}
                    onChange={(e) => setBirthPlace(e.target.value)}
                    placeholder="Бишкек"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E6E0D5] rounded-lg focus:outline-none focus:border-[#2D5A4C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5E574E] mb-1">Профессия</label>
                  <input
                    type="text"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder="Инженер"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E6E0D5] rounded-lg focus:outline-none focus:border-[#2D5A4C]"
                  />
                </div>
              </div>

              {targetSpouse && (
                <label className="flex items-center gap-2.5 bg-white border border-[#E6E0D5] rounded-xl px-3.5 py-2.5 text-xs text-[#26221E] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alsoLinkSecondParent}
                    onChange={(e) => setAlsoLinkSecondParent(e.target.checked)}
                    className="w-4 h-4 accent-[#2D5A4C]"
                  />
                  <span>
                    Также указать вторым родителем супруга(у):{' '}
                    <strong>{formatFullName(targetSpouse)}</strong>
                  </span>
                </label>
              )}
            </>
          )}

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E6E0D5]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#E6E0D5] bg-white text-sm font-medium text-[#5E574E] hover:bg-[#F3EFE8] cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#2D5A4C] hover:bg-[#23473C] text-white text-sm font-medium cursor-pointer"
            >
              {mode === 'existing' ? 'Связать' : 'Добавить в древо'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
