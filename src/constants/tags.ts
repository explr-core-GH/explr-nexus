// Tag options for inventory visibility
export const VISIBILITY_TAGS = [
  'FTC',
  'FRC',
  'FLL',
  'CS',
  'All',
  'Drones',
  'Nonprofit',
  'Seaperch',
] as const;

export type VisibilityTag = typeof VISIBILITY_TAGS[number];
