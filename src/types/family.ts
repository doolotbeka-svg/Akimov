export type Gender = 'male' | 'female';

export type LineageFilter = 'all' | 'paternal' | 'maternal';

export type RelationType = 'parent' | 'spouse' | 'child';

export interface GalleryItem {
  id: string;
  title: string;
  date?: string;
  dataUrl: string;
  kind: 'photo' | 'document';
}

export interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  maidenName?: string;
  gender: Gender;
  avatar?: string;
  birthDate?: string;
  deathDate?: string;
  isLiving: boolean;
  birthPlace?: string;
  residence?: string;
  profession?: string;
  bio?: string;
  facts: string[];
  gallery: GalleryItem[];
  parentIds: string[];
  spouseIds: string[];
  childIds: string[];
}

export interface FamilyTreeData {
  familyName: string;
  anchorPersonId: string | null;
  members: Record<string, FamilyMember>;
}
