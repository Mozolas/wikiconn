import n from 'eslint-plugin-n';
import globals from 'globals';

import { baseConfig } from './base.mjs';

/** ESLint config for NestJS / Node backend services. */
export const nestConfig = [
  ...baseConfig,
  n.configs['flat/recommended'],
  {
    files: ['**/*.{ts,js,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'n/no-missing-import': 'off',
      'n/no-extraneous-import': 'off',
      'n/no-unpublished-import': 'off',
      'n/no-unsupported-features/node-builtins': 'off',
      'n/no-process-env': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
];

export default nestConfig;
