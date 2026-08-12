import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only auto-cleans when Vitest globals are enabled; they are not,
// so without this every render would leak into the next test's queries.
afterEach(() => {
  cleanup();
});
