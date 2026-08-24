import { expect, test } from '@playwright/test';

/**
 * A captação no navegador de verdade (C-04).
 *
 * O princípio nº 4 diz "sem download". Isso não se prova com teste de
 * unidade: prova-se abrindo um navegador, pedindo câmera e vendo imagem. O
 * Chrome entra aqui com câmera falsa por flag — ver `playwright.config.ts`.
 */

const DUELO = '/duelo/duelo-de-teste/publicar';

// A tela é server component: quem valida a sessão é o servidor do Next,
// repassando o cookie para a API. Sem cookie no navegador, a página redireciona
// para o login antes de qualquer câmera existir.
test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: 'trendi_session', value: 'sessao-de-teste', url: 'http://127.0.0.1:3100' },
  ]);
});

test('liga a câmera e mostra a prévia com imagem', async ({ page }) => {
  await page.goto(DUELO);

  await expect(page.getByRole('heading', { name: 'Sua câmera' })).toBeVisible();
  await expect(page.getByTestId('estado')).toContainText('ocioso');

  await page.getByRole('button', { name: 'Ligar câmera' }).click();

  await expect(page.getByTestId('estado')).toContainText('previa');

  // Prévia com imagem de verdade: o vídeo precisa ter dimensão e quadro
  // pronto. Elemento presente não prova captação nenhuma.
  const previa = page.getByTestId('previa');
  await expect
    .poll(async () =>
      previa.evaluate(
        (video) =>
          (video as HTMLVideoElement).videoWidth > 0 && (video as HTMLVideoElement).readyState >= 2,
      ),
    )
    .toBe(true);
});

test('entra em modo local quando não há fornecedor de vídeo', async ({ page }) => {
  await page.goto(DUELO);
  await page.getByRole('button', { name: 'Ligar câmera' }).click();
  await expect(page.getByTestId('estado')).toContainText('previa');

  await page.getByRole('button', { name: 'Entrar no duelo' }).click();

  // A API responde 503 até L-19. A tela precisa dizer isso na cara, em vez de
  // deixar a pessoa achar que está no ar.
  await expect(page.getByText(/Modo local/)).toBeVisible();
  await expect(page.getByText('No ar')).toHaveCount(0);
  await expect(page.getByTestId('estado')).toContainText('publicando');
});

test('corta e devolve câmera e microfone', async ({ page }) => {
  await page.goto(DUELO);
  await page.getByRole('button', { name: 'Ligar câmera' }).click();
  await expect(page.getByTestId('estado')).toContainText('previa');

  await page.getByRole('button', { name: 'Cortar câmera' }).click();
  await expect(page.getByRole('button', { name: 'Voltar câmera' })).toBeVisible();

  // Cortar desliga a trilha, não a captação: o stream continua de pé.
  const trilhaDesligada = await page
    .getByTestId('previa')
    .evaluate((video) =>
      ((video as HTMLVideoElement).srcObject as MediaStream).getVideoTracks()[0]?.enabled === false,
    );
  expect(trilhaDesligada).toBe(true);

  await page.getByRole('button', { name: 'Voltar câmera' }).click();
  await expect(page.getByRole('button', { name: 'Cortar câmera' })).toBeVisible();

  await page.getByRole('button', { name: 'Cortar microfone' }).click();
  await expect(page.getByRole('button', { name: 'Voltar microfone' })).toBeVisible();
});

test('não abre a câmera para quem não compete no duelo', async ({ page }) => {
  await page.goto('/duelo/duelo-dos-outros/publicar');

  await expect(page.getByText(/não é competidor deste duelo/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ligar câmera' })).toHaveCount(0);
});

test('avisa quando o duelo não existe', async ({ page }) => {
  await page.goto('/duelo/nao-existe/publicar');

  await expect(page.getByText(/Esse duelo não existe/)).toBeVisible();
});
