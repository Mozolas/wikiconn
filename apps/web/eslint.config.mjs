import reactConfig from '@wikiconn/eslint-config/react';

export default [
  ...reactConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'import-x/no-default-export': 'off',
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
    },
  },
  {
    files: ['src/**/*page.tsx', 'src/**/layout.tsx', 'src/**/*.config.{ts,js,mjs}'],
    rules: {
      'unicorn/filename-case': 'off',
    },
  },
  {
    ignores: ['.next/**', 'next-env.d.ts'],
  },
];
