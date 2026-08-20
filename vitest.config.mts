import { defineConfig } from 'vitest/config';

// Um único runner para o monorepo. Os testes ficam ao lado do código que
// testam (`src/**/*.test.ts`), como manda 02-arquitetura/convencoes.md.
export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts'],
  },
});
