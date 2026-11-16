import { FamilyMember, LineageFilter } from '../types/family';

/**
 * Returns the set of member IDs visible under the chosen lineage filter.
 * - 'all': all members
 * - 'paternal': anchor, anchor's descendants & siblings, anchor's father and all ancestors on father's branch
 * - 'maternal': anchor, anchor's descendants & siblings, anchor's mother and all ancestors on mother's branch
 */
export function getVisibleMemberIds(
  members: Record<string, FamilyMember>,
  filter: LineageFilter,
  anchorPersonId: string | null
): Set<string> {
  const allIds = Object.keys(members);
  if (filter === 'all' || !anchorPersonId || !members[anchorPersonId]) {
    return new Set(allIds);
  }

  const visible = new Set<string>();
  const anchor = members[anchorPersonId];
  visible.add(anchor.id);

  // Include anchor's direct descendants (children, grandchildren) and their spouses
  const addDescendants = (personId: string, visited: Set<string>) => {
    if (visited.has(personId)) return;
    visited.add(personId);
    const person = members[personId];
    if (!person) return;
    visible.add(person.id);
    for (const childId of person.childIds) {
      if (members[childId]) {
        visible.add(childId);
        addDescendants(childId, visited);
      }
    }
  };
  addDescendants(anchor.id, new Set());

  // Determine the selected parent (father for paternal, mother for maternal)
  const parents = anchor.parentIds.map((id) => members[id]).filter(Boolean);
  const targetParent =
    filter === 'paternal'
      ? parents.find((p) => p.gender === 'male')
      : parents.find((p) => p.gender === 'female');

  if (!targetParent) {
    return visible;
  }

  // Also include full/half siblings sharing that target parent so family context stays intact
  for (const childId of targetParent.childIds) {
    if (members[childId]) {
      visible.add(childId);
    }
  }

  // Traverse all ancestors above targetParent (including both parents at higher generations + their children/siblings on that side)
  const addAncestors = (personId: string, visited: Set<string>) => {
    if (visited.has(personId)) return;
    visited.add(personId);
    const person = members[personId];
    if (!person) return;
    visible.add(person.id);

    // Include spouses of ancestors on this branch if they share parenthood of a visible child
    for (const parentId of person.parentIds) {
      const parent = members[parentId];
      if (parent) {
        visible.add(parent.id);
        // Include parent's other children (aunts/uncles on this branch)
        for (const siblingId of parent.childIds) {
          if (members[siblingId]) {
            visible.add(siblingId);
          }
        }
        addAncestors(parent.id, visited);
      }
    }
  };

  addAncestors(targetParent.id, new Set());

  return visible;
}

/**
 * Finds a sensible default anchor person (youngest generation member who has both parents if possible)
 */
export function findDefaultAnchorId(members: Record<string, FamilyMember>): string | null {
  const list = Object.values(members);
  if (list.length === 0) return null;

  // Prefer someone who has parents and no children (youngest generation), especially with both male and female parents
  const withBothParents = list.filter((m) => {
    const parents = m.parentIds.map((id) => members[id]).filter(Boolean);
    return parents.some((p) => p.gender === 'male') && parents.some((p) => p.gender === 'female');
  });

  if (withBothParents.length > 0) {
    const leaf = withBothParents.find((m) => m.childIds.length === 0);
    return (leaf ?? withBothParents[0]).id;
  }

  const withParents = list.filter((m) => m.parentIds.length > 0);
  if (withParents.length > 0) return withParents[0].id;

  return list[0].id;
}
