import { z } from 'zod';

export const visibilitySettingsSchema = z.object({
  showCurrentArticle: z.boolean(),
  showClickCount: z.boolean(),
  showFullPath: z.boolean(),
});

export type VisibilitySettings = z.infer<typeof visibilitySettingsSchema>;

export const DEFAULT_VISIBILITY_SETTINGS: VisibilitySettings = {
  showCurrentArticle: true,
  showClickCount: true,
  showFullPath: false,
};
