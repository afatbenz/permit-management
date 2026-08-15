/**
 * Preset colors a permit category may take. Mirrors the backend palette
 * (`epermit-backend/src/modules/project-category/category-color-palette.ts`).
 * Keep the two lists in sync.
 */
export const CATEGORY_COLORS = [
  '#DC2626',
  '#D97706',
  '#059669',
  '#0284C7',
  '#7C3AED',
  '#DB2777',
  '#0891B2',
  '#EA580C',
  '#16A34A',
  '#4F46E5',
] as const;

/** Converts `#RRGGBB` to `#RRGGBBAA` (8-digit hex) for translucent tints. */
export function hexWithAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${clean}${a}`;
}
