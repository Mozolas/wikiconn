import { z } from 'zod';

export const languageSchema = z.enum(['en', 'cs']);
export type Language = z.infer<typeof languageSchema>;

export const SUPPORTED_LANGUAGES = languageSchema.options;
