import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const src = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Um único runner para o monorepo. Os testes ficam ao lado do código que
// testam (`src/**/*.test.ts`), como manda 02-arquitetura/convencoes.md.
export default defineConfig({
  resolve: {
    // Os testes leem o código-fonte dos pacotes, não o `dist`: assim rodar
    // teste nunca depende de ter buildado antes.
    alias: {
      '@trendi/shared/realtime-ticket': src('./packages/shared/src/realtime-ticket.ts'),
      '@trendi/shared': src('./packages/shared/src/index.ts'),
      '@trendi/db/testing': src('./packages/db/src/testing.ts'),
      '@trendi/db': src('./packages/db/src/index.ts'),
      '@trendi/video': src('./packages/video/src/index.ts'),
    },
  },
  test: {
    // O cliente web não tem `src/`: o código dele vive em `app/` e `lib/`.
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts', 'apps/web/lib/**/*.test.ts'],
    // Postgres em memória sobe uma vez por arquivo de teste; o padrão de 5s
    // não cobre isso.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
