import { expect, test } from '@playwright/test';

/**
 * O estádio no navegador de verdade (C-06).
 *
 * Três coisas que só se provam abrindo a página: que **visitante assiste**
 * sem esbarrar em cadastro, que **não aparece placar durante a votação**, e
 * que o chat de verdade conecta e recebe. As duas primeiras são regra de
 * produto; a terceira nunca tinha acontecido — o servidor de tempo real
 * (C-07) jamais havia recebido conexão de navegador nenhuma.
 */

const COOKIE = {
  name: 'trendi_session',
  value: 'sessao-de-teste',
  url: 'http://127.0.0.1:3100',
};

test.describe('visitante', () => {
  // Sem cookie: é assim que o Next enxerga quem chegou por um link.

  test('assiste ao duelo sem ter conta', async ({ page }) => {
    await page.goto('/duelo/duelo-no-ar');

    await expect(page.getByRole('heading', { name: /Leo/ })).toContainText('Rival');
    await expect(page.getByTestId('estado')).toContainText('running');
    // Nada de redirecionar para o login: assistir não pede conta.
    expect(new URL(page.url()).pathname).toBe('/duelo/duelo-no-ar');
  });

  test('vê que não há vídeo, em vez de quadro preto sem explicação', async ({ page }) => {
    await page.goto('/duelo/duelo-no-ar');

    await expect(page.getByTestId('sem-video')).toContainText('Ainda não há vídeo');
  });

  test('é convidado a entrar só quando há o que fazer', async ({ page }) => {
    await page.goto('/duelo/duelo-no-ar');
    await expect(page.getByTestId('entrar-para-votar')).toHaveCount(0);

    await page.goto('/duelo/duelo-em-votacao');
    await expect(page.getByTestId('entrar-para-votar')).toBeVisible();
    await expect(page.getByTestId('votar-a')).toHaveCount(0);
  });

  test('não escreve no chat, e a tela diz por quê', async ({ page }) => {
    await page.goto('/duelo/duelo-no-ar');

    await expect(page.getByTestId('entrar-para-falar')).toBeVisible();
    await expect(page.getByTestId('rascunho')).toHaveCount(0);
  });
});

test.describe('quem tem conta', () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([COOKIE]);
  });

  test('vota, e a tela reconhece o voto', async ({ page }) => {
    await page.goto('/duelo/duelo-em-votacao');

    await page.getByTestId('votar-b').click();

    await expect(page.getByTestId('chamada')).toContainText('Voto registrado');
    // Uma conta, um voto: os botões saem da tela.
    await expect(page.getByTestId('votar-a')).toHaveCount(0);
  });

  test('não vê placar enquanto a votação está aberta', async ({ page }) => {
    await page.goto('/duelo/duelo-em-votacao');

    // A regra é do produto: placar que anda ao vivo empurra quem ainda não
    // votou para o lado que está ganhando.
    await expect(page.getByTestId('placar')).toHaveCount(0);
    // O número de votantes sai — isso é atmosfera, não placar, e não diz
    // em quem ninguém votou.
    await expect(page.getByTestId('votantes')).toBeVisible();
  });

  test('não mostra placar nem quando o servidor manda um', async ({ page }) => {
    // Duas camadas seguram esta regra: a API não devolve apuração parcial
    // (tem teste próprio) e a tela não mostra. Aqui a API de mentira devolve
    // de propósito, para a segunda camada ser a única coisa em pé.
    await page.goto('/duelo/duelo-que-vaza');

    await expect(page.getByTestId('estado')).toContainText('voting');
    await expect(page.getByTestId('placar')).toHaveCount(0);
  });

  test('vê o placar no resultado', async ({ page }) => {
    await page.goto('/duelo/duelo-decidido');

    await expect(page.getByTestId('placar')).toContainText('Vitória de Leo');
    await expect(page.getByTestId('placar')).toContainText('62%');
  });

  test('conecta no chat, recebe o histórico e fala', async ({ page }) => {
    await page.goto('/duelo/duelo-no-ar');

    const chat = page.getByTestId('chat');
    await expect(chat).toContainText('boa sorte');

    await page.getByTestId('rascunho').fill('vamo');
    await page.getByRole('button', { name: 'Enviar' }).click();

    await expect(chat).toContainText('vamo');
    await expect(page.getByTestId('rascunho')).toHaveValue('');
  });
});

test('avisa quando o duelo não existe', async ({ page }) => {
  await page.goto('/duelo/nao-existe');

  await expect(page.getByText(/Esse duelo não existe/)).toBeVisible();
});

test('a tela vira de execução para votação sem recarregar (C-38)', async ({ page, context, request }) => {
  // O que a C-38 produz: o aviso da sala chega e a tela muda sozinha. Antes
  // dela, isso só acontecia quando a releitura periódica calhasse — e a
  // janela de votação dura 30 a 45 segundos, então "quando calhar" é
  // vantagem para uns e desvantagem para outros.
  await context.addCookies([COOKIE]);
  await request.post('http://127.0.0.1:3199/testes/duels/duelo-que-vira/estado/running');

  await page.goto('/duelo/duelo-que-vira');
  await expect(page.getByTestId('estado')).toContainText('running');
  await expect(page.getByTestId('votar-a')).toHaveCount(0);

  await request.post('http://127.0.0.1:3199/testes/duels/duelo-que-vira/estado/voting');

  await expect(page.getByTestId('estado')).toContainText('voting');
  await expect(page.getByTestId('votar-a')).toBeVisible();
});

test('mostra o desafio e o tempo — é o que a plateia está julgando (C-10)', async ({ page }) => {
  await page.goto('/duelo/duelo-no-ar');

  const desafio = page.getByTestId('desafio');
  await expect(desafio).toContainText('Aura');
  await expect(desafio).toContainText('presença');
  // O critério não é regra que a plataforma faz cumprir (D-21): é a frase
  // que diz à arquibancada o que ela está julgando.
  await expect(desafio).toContainText('dominou a tela');
  await expect(page.getByTestId('tempo')).toContainText('60s');
});

