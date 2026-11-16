import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, X } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (password: string) => Promise<'ok' | 'wrong' | 'error'>;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowPassword(false);
      setPassword('');
      setError(null);
      setBusy(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    const result = await onLogin(password.trim());
    setBusy(false);
    if (result === 'ok') onClose();
    else if (result === 'wrong') setError('Неверный пароль.');
    else setError('Нет связи с сервером. Попробуйте ещё раз.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#26221E]/35 backdrop-blur-[2px]"
        aria-hidden="true"
      />
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        className="relative z-10 w-full max-w-sm bg-[#FAF8F5] border border-[#E6E0D5] rounded-2xl shadow-xl p-6"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#5E574E] hover:bg-[#F3EFE8] cursor-pointer"
          aria-label="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-11 h-11 mb-4 rounded-full bg-[#E9EFEA] text-[#2D5A4C] flex items-center justify-center">
          <KeyRound className="w-5 h-5" />
        </div>
        <h2 id="login-title" className="font-display text-2xl font-semibold text-[#26221E] mb-1">
          Вход для правок
        </h2>
        <p className="text-sm text-[#5E574E] mb-4">
          Смотреть древо могут все. Чтобы добавлять родных и менять записи, введите семейный пароль.
        </p>

        <label htmlFor="edit-password" className="block text-xs font-medium text-[#5E574E] mb-1">
          Пароль
        </label>
        <div className="relative">
          <input
            id="edit-password"
            type={showPassword ? 'text' : 'password'}
            autoFocus
            // Don't let the browser fill in some other saved password.
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-3 pr-11 py-2.5 text-sm bg-white border border-[#E6E0D5] rounded-lg focus:outline-none focus:border-[#2D5A4C]"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 inline-flex items-center justify-center rounded-md text-[#8A8175] hover:text-[#26221E] cursor-pointer"
            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-[#B85D3B]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!password || busy}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#2D5A4C] hover:bg-[#23473C] disabled:opacity-60 text-white text-sm font-medium transition-colors cursor-pointer"
        >
          {busy ? 'Проверяем…' : 'Войти'}
        </button>
      </form>
    </div>
  );
};
