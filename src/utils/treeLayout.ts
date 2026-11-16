import { FamilyMember } from '../types/family';

export const CARD_WIDTH = 224;
export const CARD_HEIGHT = 110;
export const SPOUSE_GAP = 34;
export const UNIT_GAP = 54;
export const GEN_STEP_Y = 204;

export interface PositionedMember {
  member: FamilyMember;
  x: number;
  y: number;
  generation: number;
}

export interface SpouseConnector {
  id: string;
  fromId: string;
  toId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  adjacent: boolean;
}

export interface ParentChildConnector {
  id: string;
  parentIds: string[];
  childIds: string[];
  path: string;
  stemX: number;
  stemY: number;
}

export interface GenerationBand {
  generation: number;
  label: string;
  y: number;
}

export interface TreeLayoutResult {
  nodes: PositionedMember[];
  nodeMap: Record<string, PositionedMember>;
  spouseConnectors: SpouseConnector[];
  parentChildConnectors: ParentChildConnector[];
  generations: GenerationBand[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  };
}

interface HorizontalUnit {
  id: string;
  memberIds: string[];
  width: number;
  x: number;
}

function romanNumeral(num: number): string {
  const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return romans[num] ?? String(num + 1);
}

/**
 * Computes a collision-free generational tree layout with spouse grouping and orthogonal rounded connectors.
 */
export function computeTreeLayout(
  allMembers: Record<string, FamilyMember>,
  visibleIds: Set<string>
): TreeLayoutResult {
  const visibleMembers = Array.from(visibleIds)
    .map((id) => allMembers[id])
    .filter(Boolean);

  if (visibleMembers.length === 0) {
    return {
      nodes: [],
      nodeMap: {},
      spouseConnectors: [],
      parentChildConnectors: [],
      generations: [],
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 },
    };
  }

  // 1. Assign generation levels per connected component via BFS
  const genMap: Record<string, number> = {};
  const visited = new Set<string>();

  for (const start of visibleMembers) {
    if (visited.has(start.id)) continue;

    const component: string[] = [];
    const queue: Array<{ id: string; gen: number }> = [{ id: start.id, gen: 0 }];
    genMap[start.id] = 0;
    visited.add(start.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current.id);
      const m = allMembers[current.id];
      if (!m) continue;

      for (const pid of m.parentIds) {
        if (visibleIds.has(pid) && !visited.has(pid)) {
          visited.add(pid);
          genMap[pid] = current.gen - 1;
          queue.push({ id: pid, gen: current.gen - 1 });
        }
      }
      for (const cid of m.childIds) {
        if (visibleIds.has(cid) && !visited.has(cid)) {
          visited.add(cid);
          genMap[cid] = current.gen + 1;
          queue.push({ id: cid, gen: current.gen + 1 });
        }
      }
      for (const sid of m.spouseIds) {
        if (visibleIds.has(sid) && !visited.has(sid)) {
          visited.add(sid);
          genMap[sid] = current.gen;
          queue.push({ id: sid, gen: current.gen });
        }
      }
    }

    // Normalize component min generation to 0
    let minCompGen = Infinity;
    for (const id of component) {
      if (genMap[id] < minCompGen) minCompGen = genMap[id];
    }
    for (const id of component) {
      genMap[id] -= minCompGen;
    }
  }

  // Extra relaxation pass in case of multi-path cross-generation links
  for (let iter = 0; iter < 5; iter++) {
    for (const m of visibleMembers) {
      for (const cid of m.childIds) {
        if (visibleIds.has(cid) && genMap[cid] <= genMap[m.id]) {
          genMap[cid] = genMap[m.id] + 1;
        }
      }
    }
  }

  let minGen = Infinity;
  let maxGen = -Infinity;
  for (const m of visibleMembers) {
    if (genMap[m.id] < minGen) minGen = genMap[m.id];
    if (genMap[m.id] > maxGen) maxGen = genMap[m.id];
  }
  for (const m of visibleMembers) {
    genMap[m.id] -= minGen;
  }
  maxGen -= minGen;

  // 2. Group members in each generation into horizontal Spouse/Single Units
  const genUnits: HorizontalUnit[][] = Array.from({ length: maxGen + 1 }, () => []);
  const unitOfMember: Record<string, HorizontalUnit> = {};

  for (let g = 0; g <= maxGen; g++) {
    const rowMembers = visibleMembers
      .filter((m) => genMap[m.id] === g)
      .sort((a, b) => a.id.localeCompare(b.id));

    const placedInUnit = new Set<string>();

    for (const m of rowMembers) {
      if (placedInUnit.has(m.id)) continue;

      const unitMembers: string[] = [m.id];
      placedInUnit.add(m.id);

      // BFS through spouses in the same generation
      const spouseQueue = [...m.spouseIds];
      while (spouseQueue.length > 0) {
        const sid = spouseQueue.shift()!;
        if (
          visibleIds.has(sid) &&
          genMap[sid] === g &&
          !placedInUnit.has(sid)
        ) {
          placedInUnit.add(sid);
          unitMembers.push(sid);
          const sm = allMembers[sid];
          if (sm) {
            spouseQueue.push(...sm.spouseIds);
          }
        }
      }

      // Consistent ordering inside couple: male on left, female on right when 2 spouses
      if (unitMembers.length === 2) {
        const a = allMembers[unitMembers[0]];
        const b = allMembers[unitMembers[1]];
        if (a.gender === 'female' && b.gender === 'male') {
          unitMembers.reverse();
        }
      }

      const width =
        unitMembers.length * CARD_WIDTH +
        Math.max(0, unitMembers.length - 1) * SPOUSE_GAP;

      const unit: HorizontalUnit = {
        id: unitMembers.join('+'),
        memberIds: unitMembers,
        width,
        x: 0,
      };

      genUnits[g].push(unit);
      for (const mid of unitMembers) {
        unitOfMember[mid] = unit;
      }
    }
  }

  // Helper to get current center X of a member
  const getMemberCenterX = (id: string): number => {
    const unit = unitOfMember[id];
    if (!unit) return 0;
    const idx = unit.memberIds.indexOf(id);
    return unit.x + idx * (CARD_WIDTH + SPOUSE_GAP) + CARD_WIDTH / 2;
  };

  // Initial left-to-right placement centered around 0
  for (let g = 0; g <= maxGen; g++) {
    const row = genUnits[g];
    const totalW =
      row.reduce((acc, u) => acc + u.width, 0) +
      Math.max(0, row.length - 1) * UNIT_GAP;
    let cursor = -totalW / 2;
    for (const u of row) {
      u.x = cursor;
      cursor += u.width + UNIT_GAP;
    }
  }

  // Helper to resolve overlaps and gently pull units toward target centers
  const layoutRowTowardTargets = (row: HorizontalUnit[], targets: Map<string, number>) => {
    if (row.length === 0) return;

    // Sort by target center X (keep previous center as fallback)
    row.sort((a, b) => {
      const ta = targets.get(a.id) ?? a.x + a.width / 2;
      const tb = targets.get(b.id) ?? b.x + b.width / 2;
      return ta - tb;
    });

    // Place each unit at its desired x, then resolve overlaps left-to-right
    for (const u of row) {
      const t = targets.get(u.id);
      if (t !== undefined) {
        u.x = t - u.width / 2;
      }
    }

    for (let i = 1; i < row.length; i++) {
      const prev = row[i - 1];
      const curr = row[i];
      const minX = prev.x + prev.width + UNIT_GAP;
      if (curr.x < minX) {
        curr.x = minX;
      }
    }

    // Balance shift so the row centers around average target center
    const desiredMean =
      row.reduce((sum, u) => sum + (targets.get(u.id) ?? u.x + u.width / 2), 0) /
      row.length;
    const actualMean =
      row.reduce((sum, u) => sum + (u.x + u.width / 2), 0) / row.length;
    const shift = desiredMean - actualMean;
    for (const u of row) {
      u.x += shift;
    }

    // Re-verify minimum spacing after shift (already preserved, just ensure)
    for (let i = 1; i < row.length; i++) {
      const prev = row[i - 1];
      const curr = row[i];
      const minX = prev.x + prev.width + UNIT_GAP;
      if (curr.x < minX) {
        curr.x = minX;
      }
    }
  };

  // 3. Iterative barycenter sweeps (top-down & bottom-up)
  for (let pass = 0; pass < 8; pass++) {
    // Top-down: align units under their parents (or spouses' parents)
    for (let g = 1; g <= maxGen; g++) {
      const targets = new Map<string, number>();
      for (const u of genUnits[g]) {
        const parentCenters: number[] = [];
        for (const mid of u.memberIds) {
          const m = allMembers[mid];
          if (!m) continue;
          for (const pid of m.parentIds) {
            if (visibleIds.has(pid) && genMap[pid] < g) {
              parentCenters.push(getMemberCenterX(pid));
            }
          }
        }
        if (parentCenters.length > 0) {
          const avg =
            parentCenters.reduce((a, b) => a + b, 0) / parentCenters.length;
          targets.set(u.id, avg);
        } else {
          targets.set(u.id, u.x + u.width / 2);
        }
      }
      layoutRowTowardTargets(genUnits[g], targets);
    }

    // Bottom-up: align parent units over their children
    for (let g = maxGen - 1; g >= 0; g--) {
      const targets = new Map<string, number>();
      for (const u of genUnits[g]) {
        const childCenters: number[] = [];
        for (const mid of u.memberIds) {
          const m = allMembers[mid];
          if (!m) continue;
          for (const cid of m.childIds) {
            if (visibleIds.has(cid) && genMap[cid] > g) {
              childCenters.push(getMemberCenterX(cid));
            }
          }
        }
        if (childCenters.length > 0) {
          const uniqueAvg =
            childCenters.reduce((a, b) => a + b, 0) / childCenters.length;
          targets.set(u.id, uniqueAvg);
        } else {
          targets.set(u.id, u.x + u.width / 2);
        }
      }
      layoutRowTowardTargets(genUnits[g], targets);
    }
  }

  // 4. Center the entire tree horizontally around x = 0
  let rawMinX = Infinity;
  let rawMaxX = -Infinity;
  for (let g = 0; g <= maxGen; g++) {
    for (const u of genUnits[g]) {
      if (u.x < rawMinX) rawMinX = u.x;
      if (u.x + u.width > rawMaxX) rawMaxX = u.x + u.width;
    }
  }
  const centerOffset = (rawMinX + rawMaxX) / 2;

  const nodes: PositionedMember[] = [];
  const nodeMap: Record<string, PositionedMember> = {};

  for (let g = 0; g <= maxGen; g++) {
    const y = g * GEN_STEP_Y;
    for (const u of genUnits[g]) {
      u.x -= centerOffset;
      u.memberIds.forEach((mid, idx) => {
        const member = allMembers[mid];
        if (!member) return;
        const pos: PositionedMember = {
          member,
          x: u.x + idx * (CARD_WIDTH + SPOUSE_GAP),
          y,
          generation: g,
        };
        nodes.push(pos);
        nodeMap[mid] = pos;
      });
    }
  }

  // 5. Build Spouse Connectors
  const spouseConnectors: SpouseConnector[] = [];
  const seenSpousePairs = new Set<string>();

  for (const pos of nodes) {
    for (const sid of pos.member.spouseIds) {
      if (!nodeMap[sid]) continue;
      const pairKey = [pos.member.id, sid].sort().join('::');
      if (seenSpousePairs.has(pairKey)) continue;
      seenSpousePairs.add(pairKey);

      const other = nodeMap[sid];
      const left = pos.x <= other.x ? pos : other;
      const right = pos.x <= other.x ? other : pos;
      const sameRow = left.generation === right.generation;
      const adjacent =
        sameRow && Math.abs(right.x - (left.x + CARD_WIDTH) - SPOUSE_GAP) < 2;

      spouseConnectors.push({
        id: pairKey,
        fromId: left.member.id,
        toId: right.member.id,
        x1: left.x + CARD_WIDTH,
        y1: left.y + CARD_HEIGHT / 2,
        x2: right.x,
        y2: right.y + CARD_HEIGHT / 2,
        adjacent,
      });
    }
  }

  // 6. Build Parent-Child Connectors (grouped by parent set so siblings share a clean bus line)
  const familyGroups = new Map<
    string,
    { parentIds: string[]; childIds: string[] }
  >();

  for (const pos of nodes) {
    const visibleParents = pos.member.parentIds
      .filter((pid) => Boolean(nodeMap[pid]))
      .sort();
    if (visibleParents.length === 0) continue;

    const key = visibleParents.join('|');
    const existing = familyGroups.get(key);
    if (existing) {
      existing.childIds.push(pos.member.id);
    } else {
      familyGroups.set(key, {
        parentIds: visibleParents,
        childIds: [pos.member.id],
      });
    }
  }

  const parentChildConnectors: ParentChildConnector[] = [];

  for (const [key, group] of familyGroups.entries()) {
    const parents = group.parentIds.map((id) => nodeMap[id]);
    const children = group.childIds.map((id) => nodeMap[id]);

    // Determine stem origin
    let stemX = 0;
    let stemY = 0;

    if (parents.length === 2) {
      const [p1, p2] = parents[0].x <= parents[1].x ? [parents[0], parents[1]] : [parents[1], parents[0]];
      const isSpouseBridge =
        p1.member.spouseIds.includes(p2.member.id) &&
        p1.generation === p2.generation &&
        Math.abs(p2.x - (p1.x + CARD_WIDTH) - SPOUSE_GAP) < 2;

      if (isSpouseBridge) {
        stemX = p1.x + CARD_WIDTH + SPOUSE_GAP / 2;
        stemY = p1.y + CARD_HEIGHT / 2;
      } else {
        stemX = (p1.x + CARD_WIDTH / 2 + p2.x + CARD_WIDTH / 2) / 2;
        stemY = Math.max(p1.y, p2.y) + CARD_HEIGHT;
      }
    } else {
      const p = parents[0];
      stemX = p.x + CARD_WIDTH / 2;
      stemY = p.y + CARD_HEIGHT;
    }

    const maxParentBottom = Math.max(...parents.map((p) => p.y + CARD_HEIGHT));
    const minChildTop = Math.min(...children.map((c) => c.y));
    const busY = maxParentBottom + (minChildTop - maxParentBottom) * 0.48;

    const parts: string[] = [];

    for (const child of children) {
      const cx = child.x + CARD_WIDTH / 2;
      const cy = child.y;

      if (Math.abs(cx - stemX) < 1) {
        parts.push(`M ${stemX} ${stemY} L ${cx} ${cy}`);
      } else {
        const dir = cx > stemX ? 1 : -1;
        const r = Math.min(10, Math.abs(cx - stemX) / 2, Math.abs(busY - stemY) / 2, Math.abs(cy - busY) / 2);
        parts.push(
          [
            `M ${stemX} ${stemY}`,
            `L ${stemX} ${busY - r}`,
            `Q ${stemX} ${busY} ${stemX + dir * r} ${busY}`,
            `L ${cx - dir * r} ${busY}`,
            `Q ${cx} ${busY} ${cx} ${busY + r}`,
            `L ${cx} ${cy}`,
          ].join(' ')
        );
      }
    }

    parentChildConnectors.push({
      id: `pc-${key}`,
      parentIds: group.parentIds,
      childIds: group.childIds,
      path: parts.join(' '),
      stemX,
      stemY,
    });
  }

  // 7. Generation Bands
  const generations: GenerationBand[] = Array.from({ length: maxGen + 1 }, (_, g) => ({
    generation: g,
    label: `Поколение ${romanNumeral(g)}`,
    y: g * GEN_STEP_Y,
  }));

  const finalMinX = Math.min(...nodes.map((n) => n.x));
  const finalMaxX = Math.max(...nodes.map((n) => n.x + CARD_WIDTH));
  const finalMinY = Math.min(...nodes.map((n) => n.y));
  const finalMaxY = Math.max(...nodes.map((n) => n.y + CARD_HEIGHT));

  return {
    nodes,
    nodeMap,
    spouseConnectors,
    parentChildConnectors,
    generations,
    bounds: {
      minX: finalMinX,
      maxX: finalMaxX,
      minY: finalMinY,
      maxY: finalMaxY,
      width: finalMaxX - finalMinX,
      height: finalMaxY - finalMinY,
    },
  };
}
