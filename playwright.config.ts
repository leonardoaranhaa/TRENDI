import { defineConfig, devices } from '@playwright/test';

/**
 * Testes de navegador (C-04 e C-06).
 *
 * Duas coisas que não se verificam com teste de unidade. A captação é o
 * princípio nº 4 do projeto — sem download —, e precisa de navegador de
 * verdade pedindo câmera de verdade: o Chrome aceita uma câmera falsa por
 * flag, que é o que torna isso possível sem hardware e sem alguém clicando
 * em "permitir". E o estádio precisa provar que **visitante assiste**, o que
 * só se vê abrindo a página sem cookie nenhum.
 *
 * O `webServer` sobe o cliente já compilado, mais uma API de mentira que
 * também fala WebSocket. A API e o tempo real de verdade têm os próprios
 * testes, contra Postgres de verdade.
 */
export default defineConfig({
  testDir: './apps/web/testes',
  fullyParallel: true,
  forbidOnly: process.env['CI'] !== undefined,
  retries: process.env['CI'] !== undefined ? 1 : 0,
  reporter: process.env['CI'] !== undefined ? 'github' : 'list',

  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          // Esta máquina já vem com Chromium instalado, e a versão dele não
          // é a que este Playwright baixaria. Apontar para o que existe evita
          // um download de 150 MB a cada ambiente novo — inclusive no CI,
          // onde o passo de instalação cuida disso.
          ...(process.env['CHROMIUM_EXECUTAVEL'] === undefined
            ? {}
            : { executablePath: process.env['CHROMIUM_EXECUTAVEL'] }),
          args: [
            // Câmera e microfone de mentira, aceitos sem diálogo. Sem isso o
            // teste travaria esperando alguém clicar em "permitir".
            '--use-fake-device-for-media-stream',
            '--use-fake-ui-for-media-stream',
          ],
        },
      },
    },
  ],

  webServer: [
    {
      command: 'node apps/web/testes/api-de-mentira.mjs',
      url: 'http://127.0.0.1:3199/auth/session',
      reuseExistingServer: process.env['CI'] === undefined,
      timeout: 30_000,
    },
    {
      command: 'npm run start -w @trendi/web -- --port 3100',
      url: 'http://127.0.0.1:3100',
      reuseExistingServer: process.env['CI'] === undefined,
      timeout: 120_000,
      env: {
        // O servidor do Next busca aqui; o navegador chega pelo rewrite de
        // `/api/*`, que aponta para o mesmo lugar.
        API_INTERNAL_URL: 'http://127.0.0.1:3199',
        API_PUBLIC_URL: 'http://127.0.0.1:3199',
      },
    },
  ],
});
