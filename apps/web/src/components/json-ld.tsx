import { type ReactNode } from 'react';

import { type JsonLdNode } from '@/lib/structured-data';

/**
 * Serialises a schema.org graph into the document. `<` is escaped because a
 * literal `</script>` anywhere in the data would close the tag early.
 */
export function JsonLd({ data }: { data: JsonLdNode }): ReactNode {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replaceAll('<', String.raw`\u003c`) }}
    />
  );
}
