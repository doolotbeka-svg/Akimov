import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AddRelationModal } from './components/AddRelationModal';
import { ConfirmResetModal } from './components/ConfirmResetModal';
import { ExportImportModal } from './components/ExportImportModal';
import {
  FamilyTreeCanvas,
  FamilyTreeCanvasHandle,
} from './components/FamilyTreeCanvas';
import { LightboxModal } from './components/LightboxModal';
import { MemberDrawer } from './components/MemberDrawer';
import { TopBar } from './components/TopBar';
import { TreeToolbar } from './components/TreeToolbar';
import { DEMO_FAMILY_DATA } from './data/demoFamily';
import {
  FamilyMember,
  FamilyTreeData,
  GalleryItem,
  LineageFilter,
  RelationType,
} from './types/family';
import { LoginModal } from './components/LoginModal';
import { SyncNotice } from './components/SyncNotice';
import { useSharedTree } from './hooks/useSharedTree';
import { normalizeRelations } from './utils/exportImport';
import { findDefaultAnchorId, getVisibleMemberIds } from './utils/lineageFilter';
import { computeTreeLayout } from './utils/treeLayout';

const STORAGE_KEY = 'semeyny_albom_family_tree_v1';

function loadInitialTree(): FamilyTreeData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FamilyTreeData;
      if (parsed && typeof parsed === 'object' && parsed.members && typeof parsed.members === 'object') {
        const members = normalizeRelations(parsed.members);
        return {
          familyName:
            typeof parsed.familyName === 'string' && parsed.familyName.trim()
              ? parsed.familyName
              : 'Моё родовое древо',
          anchorPersonId:
            parsed.anchorPersonId && members[parsed.anchorPersonId] ? parsed.anchorPersonId : null,
          members,
        };
      }
    }
  } catch {
    // Fallback to demo data if localStorage is corrupted
  }
  return DEMO_FAMILY_DATA;
}

function addUnique(list: string[], id: string): string[] {
  return list.includes(id) ? list : [...list, id];
}

export default function App() {
  const {
    treeData,
    editTree,
    canEdit,
    status: syncStatus,
    notice,
    dismissNotice,
    login,
    logout,
  } = useSharedTree(loadInitialTree);
  const [loginOpen, setLoginOpen] = useState(false);
  // "От кого" in the lineage filter is a personal view setting, not shared data.
  const [anchorOverride, setAnchorOverride] = useState<string | null>(null);
  const [lineageFilter, setLineageFilter] = useState<LineageFilter>('all');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [highlightedMemberId, setHighlightedMemberId] = useState<string | null>(null);

  const [addModalState, setAddModalState] = useState<{
    open: boolean;
    targetId: string | null;
    relation: RelationType | null;
  }>({ open: false, targetId: null, relation: null });

  const [exportImportModal, setExportImportModal] = useState<{
    open: boolean;
    tab: 'export' | 'import';
  }>({ open: false, tab: 'export' });

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);

  const canvasRef = useRef<FamilyTreeCanvasHandle>(null);

  // Persist automatically to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(treeData));
    } catch {
      // Ignore quota exceeded silently so UI never crashes
    }
  }, [treeData]);

  // Clear search highlight after brief visual emphasis
  useEffect(() => {
    if (!highlightedMemberId) return;
    const t = setTimeout(() => setHighlightedMemberId(null), 2200);
    return () => clearTimeout(t);
  }, [highlightedMemberId]);

  const effectiveAnchorId = useMemo(() => {
    if (anchorOverride && treeData.members[anchorOverride]) return anchorOverride;
    if (treeData.anchorPersonId && treeData.members[treeData.anchorPersonId]) {
      return treeData.anchorPersonId;
    }
    return findDefaultAnchorId(treeData.members);
  }, [anchorOverride, treeData.anchorPersonId, treeData.members]);

  const visibleMemberIds = useMemo(
    () => getVisibleMemberIds(treeData.members, lineageFilter, effectiveAnchorId),
    [treeData.members, lineageFilter, effectiveAnchorId]
  );

  const treeLayout = useMemo(
    () => computeTreeLayout(treeData.members, visibleMemberIds),
    [treeData.members, visibleMemberIds]
  );

  const selectedMember = selectedMemberId ? treeData.members[selectedMemberId] ?? null : null;
  const hasAnyMembers = Object.keys(treeData.members).length > 0;

  // Centering is deferred until the layout containing the person is rendered.
  // Otherwise, when the filter switches to 'all', centering runs on the stale layout
  // (person missing) and the subsequent auto "fit to screen" overrides it.
  const [pendingCenterId, setPendingCenterId] = useState<string | null>(null);

  const handleSelectAndCenter = useCallback(
    (memberId: string) => {
      if (!visibleMemberIds.has(memberId)) {
        setLineageFilter('all');
      }
      setSelectedMemberId(memberId);
      setHighlightedMemberId(memberId);
      setPendingCenterId(memberId);
    },
    [visibleMemberIds]
  );

  useEffect(() => {
    if (!pendingCenterId || !treeLayout.nodeMap[pendingCenterId]) return;
    const id = pendingCenterId;
    // Child effects (canvas auto-fit rAF) are scheduled before this one, so centering wins.
    const raf = requestAnimationFrame(() => {
      canvasRef.current?.centerOnPerson(id);
      setPendingCenterId(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [pendingCenterId, treeLayout]);

  const handleUpdateMember = useCallback((updated: FamilyMember) => {
    editTree((prev) => ({
      ...prev,
      members: {
        ...prev.members,
        [updated.id]: updated,
      },
    }));
  }, []);

  const handleDeleteMember = useCallback((memberId: string) => {
    editTree((prev) => {
      const nextMembers: Record<string, FamilyMember> = {};
      for (const [id, m] of Object.entries(prev.members)) {
        if (id === memberId) continue;
        nextMembers[id] = {
          ...m,
          parentIds: m.parentIds.filter((pid) => pid !== memberId),
          spouseIds: m.spouseIds.filter((sid) => sid !== memberId),
          childIds: m.childIds.filter((cid) => cid !== memberId),
        };
      }
      return {
        ...prev,
        anchorPersonId:
          prev.anchorPersonId === memberId
            ? findDefaultAnchorId(nextMembers)
            : prev.anchorPersonId,
        members: nextMembers,
      };
    });
    setSelectedMemberId(null);
  }, []);

  const linkPair = (
    members: Record<string, FamilyMember>,
    targetId: string,
    otherId: string,
    relation: RelationType,
    alsoLinkSpouseId?: string
  ): Record<string, FamilyMember> => {
    const next = { ...members };
    const target = next[targetId];
    const other = next[otherId];
    if (!target || !other || targetId === otherId) return next;

    if (relation === 'parent') {
      // other is parent of target
      next[targetId] = { ...target, parentIds: addUnique(target.parentIds, otherId) };
      next[otherId] = { ...other, childIds: addUnique(other.childIds, targetId) };
    } else if (relation === 'spouse') {
      next[targetId] = { ...target, spouseIds: addUnique(target.spouseIds, otherId) };
      next[otherId] = { ...other, spouseIds: addUnique(other.spouseIds, targetId) };
    } else if (relation === 'child') {
      // other is child of target
      let childParentIds = addUnique(other.parentIds, targetId);
      next[targetId] = { ...target, childIds: addUnique(target.childIds, otherId) };

      if (alsoLinkSpouseId && next[alsoLinkSpouseId]) {
        const spouse = next[alsoLinkSpouseId];
        next[alsoLinkSpouseId] = {
          ...spouse,
          childIds: addUnique(spouse.childIds, otherId),
        };
        childParentIds = addUnique(childParentIds, alsoLinkSpouseId);
      }

      next[otherId] = { ...other, parentIds: childParentIds };
    }

    return next;
  };

  const handleCreateMember = useCallback(
    (
      newMember: FamilyMember,
      linkTo?: { targetId: string; relation: RelationType; alsoLinkSpouseId?: string }
    ) => {
      editTree((prev) => {
        let nextMembers = {
          ...prev.members,
          [newMember.id]: newMember,
        };
        if (linkTo) {
          nextMembers = linkPair(
            nextMembers,
            linkTo.targetId,
            newMember.id,
            linkTo.relation,
            linkTo.alsoLinkSpouseId
          );
        }
        return {
          ...prev,
          anchorPersonId: prev.anchorPersonId ?? newMember.id,
          members: nextMembers,
        };
      });
      setSelectedMemberId(newMember.id);
      setHighlightedMemberId(newMember.id);
    },
    []
  );

  const handleLinkExisting = useCallback(
    (targetId: string, existingId: string, relation: RelationType) => {
      editTree((prev) => ({
        ...prev,
        members: linkPair(prev.members, targetId, existingId, relation),
      }));
    },
    []
  );

  const handleUnlinkRelation = useCallback(
    (memberId: string, otherId: string, relation: RelationType) => {
      editTree((prev) => {
        const next = { ...prev.members };
        const a = next[memberId];
        const b = next[otherId];
        if (!a || !b) return prev;

        if (relation === 'parent') {
          next[memberId] = { ...a, parentIds: a.parentIds.filter((id) => id !== otherId) };
          next[otherId] = { ...b, childIds: b.childIds.filter((id) => id !== memberId) };
        } else if (relation === 'spouse') {
          next[memberId] = { ...a, spouseIds: a.spouseIds.filter((id) => id !== otherId) };
          next[otherId] = { ...b, spouseIds: b.spouseIds.filter((id) => id !== memberId) };
        } else if (relation === 'child') {
          next[memberId] = { ...a, childIds: a.childIds.filter((id) => id !== otherId) };
          next[otherId] = { ...b, parentIds: b.parentIds.filter((id) => id !== memberId) };
        }

        return { ...prev, members: next };
      });
    },
    []
  );

  const handleClearTree = useCallback(() => {
    editTree({
      familyName: 'Моё родовое древо',
      anchorPersonId: null,
      members: {},
    });
    setSelectedMemberId(null);
    setLineageFilter('all');
  }, []);

  const handleRestoreDemo = useCallback(() => {
    editTree(DEMO_FAMILY_DATA);
    setSelectedMemberId(null);
    setLineageFilter('all');
  }, []);

  const handleImportTree = useCallback((imported: FamilyTreeData) => {
    editTree(imported);
    setSelectedMemberId(null);
    setLineageFilter('all');
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#FAF8F5] text-[#26221E]">
      <TopBar
        canEdit={canEdit}
        syncStatus={syncStatus}
        onRequestLogin={() => setLoginOpen(true)}
        onLogout={logout}
        onOpenExportImport={(tab) => setExportImportModal({ open: true, tab })}
        onRequestReset={() => setResetModalOpen(true)}
        onAddNewMember={() =>
          setAddModalState({ open: true, targetId: null, relation: null })
        }
      />

      {notice && <SyncNotice message={notice} onClose={dismissNotice} />}

      <TreeToolbar
        canEdit={canEdit}
        familyName={treeData.familyName}
        onUpdateFamilyName={(name) =>
          editTree((prev) => ({ ...prev, familyName: name }))
        }
        members={treeData.members}
        visibleCount={treeLayout.nodes.length}
        generationCount={treeLayout.generations.length}
        lineageFilter={lineageFilter}
        onLineageFilterChange={setLineageFilter}
        anchorPersonId={effectiveAnchorId}
        onAnchorPersonChange={(id) =>
          setAnchorOverride(id)
        }
        onSelectAndCenter={handleSelectAndCenter}
      />

      <main className="flex-1 flex flex-col min-h-0 relative">
        <FamilyTreeCanvas
          ref={canvasRef}
          layout={treeLayout}
          selectedMemberId={selectedMemberId}
          highlightedMemberId={highlightedMemberId}
          anchorPersonId={effectiveAnchorId}
          isFiltered={lineageFilter !== 'all'}
          onSelectMember={(id) => setSelectedMemberId(id)}
          onAddFirstMember={() =>
            setAddModalState({ open: true, targetId: null, relation: null })
          }
          onRestoreDemo={handleRestoreDemo}
          hasAnyMembers={hasAnyMembers}
          canEdit={canEdit}
        />
      </main>

      <MemberDrawer
        canEdit={canEdit}
        member={selectedMember}
        allMembers={treeData.members}
        onClose={() => setSelectedMemberId(null)}
        onUpdateMember={handleUpdateMember}
        onDeleteMember={handleDeleteMember}
        onSelectRelative={handleSelectAndCenter}
        onOpenAddRelation={(targetId, relation) =>
          setAddModalState({ open: true, targetId, relation })
        }
        onUnlinkRelation={handleUnlinkRelation}
        onOpenLightbox={(item) => setLightboxItem(item)}
      />

      {addModalState.open && canEdit && (
        <AddRelationModal
          isOpen={addModalState.open}
          targetMember={
            addModalState.targetId ? treeData.members[addModalState.targetId] ?? null : null
          }
          relationType={addModalState.relation}
          allMembers={treeData.members}
          onClose={() => setAddModalState({ open: false, targetId: null, relation: null })}
          onCreateMember={handleCreateMember}
          onLinkExisting={handleLinkExisting}
        />
      )}

      <ExportImportModal
        isOpen={exportImportModal.open}
        initialTab={canEdit ? exportImportModal.tab : 'export'}
        canImport={canEdit}
        treeData={treeData}
        onClose={() => setExportImportModal((prev) => ({ ...prev, open: false }))}
        onImportTree={handleImportTree}
      />

      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLogin={login}
      />

      <ConfirmResetModal
        isOpen={resetModalOpen && canEdit}
        onClose={() => setResetModalOpen(false)}
        onConfirmClear={handleClearTree}
      />

      <LightboxModal
        item={lightboxItem}
        onClose={() => setLightboxItem(null)}
      />
    </div>
  );
}
