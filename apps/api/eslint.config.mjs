import nestConfig from '@wikiconn/eslint-config/nest';

export default [
  ...nestConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      // NestJS heavily uses decorators on classes; classes-as-modules is fine.
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
];
