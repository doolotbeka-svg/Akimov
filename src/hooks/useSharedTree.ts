import { useCallback, useEffect, useRef, useState } from 'react';
import { FamilyTreeData } from '../types/family';
import {
  fetchRemoteTree,
  loadSavedPassword,
  saveRemoteTree,
  storePassword,
  verifyPassword,
} from '../utils/syncApi';

export type SyncStatus = 'loading' | 'synced' | 'saving' | 'offline' | 'error';

const SAVE_DELAY_MS = 1200;
const RETRY_DELAY_MS = 10000;
const POLL_INTERVAL_MS = 20000;

/**
 * Keeps the family tree in sync with the shared server copy.
 *
 * - Everyone sees the server version; it is re-checked every 20 s and on tab focus.
 * - Only someone who entered the edit password can change it (`editTree`).
 *   Edits are saved automatically after a short pause.
 * - If two people save at once, the second gets the fresh server version and a notice.
 */
export function useSharedTree(initial: () => FamilyTreeData) {
  const [treeData, setTreeData] = useState<FamilyTreeData>(initial);
  const [password, setPassword] = useState<string | null>(loadSavedPassword);
  const [status, setStatus] = useState<SyncStatus>('loading');
  const [notice, setNotice] = useState<string | null>(null);

  const treeRef = useRef(treeData);
  treeRef.current = treeData;
  const passwordRef = useRef(password);
  passwordRef.current = password;

  const versionRef = useRef<string | null>(null);
  const revisionRef = useRef(0); // bumps on every local edit
  const savedRevisionRef = useRef(0); // last revision the server has
  const savingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasUnsaved = () => revisionRef.current !== savedRevisionRef.current;

  // ---------- Pull from server ----------
  const pull = useCallback(async () => {
    const remote = await fetchRemoteTree();
    if (!remote) {
      setStatus((s) => (s === 'loading' || s === 'synced' ? 'offline' : s));
      return;
    }
    // Never overwrite local edits that are not saved yet.
    if (hasUnsaved() || savingRef.current) return;
    if (remote.version !== versionRef.current) {
      versionRef.current = remote.version;
      if (remote.data) setTreeData(remote.data);
    }
    setStatus('synced');
  }, []);

  useEffect(() => {
    pull();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') pull();
    }, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') pull();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [pull]);

  // ---------- Push to server ----------
  const scheduleSave = useCallback((delay: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void save(), delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(async () => {
    const pw = passwordRef.current;
    if (!pw || savingRef.current || !hasUnsaved()) return;

    savingRef.current = true;
    setStatus('saving');
    const revision = revisionRef.current;
    const result = await saveRemoteTree(pw, versionRef.current, treeRef.current);
    savingRef.current = false;

    switch (result.kind) {
      case 'saved':
        versionRef.current = result.tree.version;
        savedRevisionRef.current = revision;
        if (revisionRef.current === revision) {
          // Take the server copy: new photos now point to stored files instead of inline data.
          if (result.tree.data) setTreeData(result.tree.data);
          setStatus('synced');
        } else {
          scheduleSave(SAVE_DELAY_MS); // more edits arrived while saving
        }
        break;

      case 'conflict':
        versionRef.current = result.tree.version;
        savedRevisionRef.current = revisionRef.current;
        if (result.tree.data) setTreeData(result.tree.data);
        setStatus('synced');
        setNotice(
          'Кто-то из родных только что сохранил свои изменения. Загружена свежая версия древа — ваши последние правки не сохранились, повторите их, пожалуйста.'
        );
        break;

      case 'unauthorized':
        storePassword(null);
        setPassword(null);
        savedRevisionRef.current = revisionRef.current;
        setStatus('error');
        setNotice('Пароль для правок изменился. Войдите заново, чтобы продолжить редактирование.');
        void pull();
        break;

      case 'error':
        setStatus('error');
        setNotice(result.message);
        scheduleSave(RETRY_DELAY_MS);
        break;
    }
  }, [pull, scheduleSave]);

  /** Applies a change made by the user. Ignored in view-only mode. */
  const editTree = useCallback(
    (updater: FamilyTreeData | ((prev: FamilyTreeData) => FamilyTreeData)) => {
      if (!passwordRef.current) return;
      revisionRef.current += 1;
      setTreeData(updater);
      scheduleSave(SAVE_DELAY_MS);
    },
    [scheduleSave]
  );

  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsaved() || savingRef.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // ---------- Login ----------
  const login = useCallback(async (candidate: string) => {
    const result = await verifyPassword(candidate);
    if (result === 'ok') {
      storePassword(candidate);
      setPassword(candidate);
      setNotice(null);
      setStatus((s) => (s === 'error' ? 'synced' : s));
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    storePassword(null);
    setPassword(null);
  }, []);

  return {
    treeData,
    editTree,
    canEdit: Boolean(password),
    status,
    notice,
    dismissNotice: () => setNotice(null),
    login,
    logout,
  };
}
