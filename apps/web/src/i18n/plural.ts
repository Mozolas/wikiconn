import { type Locale } from '@/i18n/config';

/**
 * A countable phrase in the forms the locale actually distinguishes. English
 * needs two, Czech needs three, so the shape is "whatever CLDR asks for, plus a
 * mandatory fallback".
 */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

const rules = new Map<Locale, Intl.PluralRules>();

function rulesFor(locale: Locale): Intl.PluralRules {
  let cached = rules.get(locale);
  if (cached === undefined) {
    cached = new Intl.PluralRules(locale);
    rules.set(locale, cached);
  }
  return cached;
}

/** Picks the right form and substitutes `{count}`. */
export function plural(locale: Locale, forms: PluralForms, count: number): string {
  const form = forms[rulesFor(locale).select(count)] ?? forms.other;
  return form.replaceAll('{count}', String(count));
}

/** Fills `{name}`-style placeholders in a plain dictionary string. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replaceAll(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/**
 * Identity function that pins a literal to `PluralForms`. Without it the
 * inferred type would be exactly the forms English happens to need, and Czech
 * — which distinguishes three — could not satisfy the dictionary type.
 */
export function pluralForms(forms: PluralForms): PluralForms {
  return forms;
}
