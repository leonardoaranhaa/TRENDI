import type { DuelState, Side } from '@trendi/shared';

/**
 * O que a plateia pode fazer no estádio (C-06).
 *
 * Mesmo desenho da `publicacao.ts` da C-04: a regra fica aqui, separada da
 * tela e da rede, porque é ela que decide o que a pessoa vê — e porque é o
 * que dá para testar sem navegador.
 *
 * Duas regras não são detalhe de tela, e é por isso que moram num módulo com
 * teste próprio:
 *
 * - **Visitante assiste.** Ver duelo não pede conta; falar e votar, sim. É o
 *   que deixa link e clipe circularem sem bater numa parede de cadastro.
 * - **Placar não anda durante a votação.** A API não devolve apuração parcial
 *   de propósito, e o estádio não inventa uma: placar ao vivo empurra quem
 *   ainda não votou para o lado que está ganhando, e o resultado passaria a
 *   medir a onda em vez do desempenho.
 */

export interface Plateia {
  /** Quem está olhando. `null` é visitante — e visitante é bem-vindo. */
  readonly logado: boolean;
  /** Em quem esta conta votou neste duelo, se votou. */
  readonly jaVotou: Side | null;
  /** Há quadro no ar para tocar. Falso enquanto não houver conta AWS (L-19). */
  readonly temVideo: boolean;
}

export interface Situacao {
  readonly podeVotar: boolean;
  readonly podeFalar: boolean;
  /** A ação da vez existe, mas exige conta. */
  readonly precisaEntrar: boolean;
  /** Só em RESULTADO. Antes disso não há placar para mostrar. */
  readonly mostraPlacar: boolean;
  /** O duelo está no ar agora. */
  readonly aoVivo: boolean;
  /** A frase da faixa de ação: o que está acontecendo e o que fazer. */
  readonly chamada: string;
}

/** Estados em que existe quadro sendo transmitido. */
const NO_AR: ReadonlySet<DuelState> = new Set<DuelState>(['running']);

/**
 * A frase de cada estado, para quem está na arquibancada.
 *
 * Escrita do ponto de vista de quem assiste, não do banco de dados: ninguém
 * na plateia quer ler "preparing".
 */
const CHAMADA: Record<DuelState, string> = {
  queued: 'Esperando adversário.',
  matched: 'Adversário encontrado. Os dois precisam aceitar.',
  accepted: 'Duelo aceito. A escolha do desafio começa agora.',
  choosing: 'Escolhendo o desafio.',
  preparing: 'Preparando. O duelo começa em instantes.',
  running: 'No ar agora.',
  voting: 'Votação aberta. Quem levou melhor?',
  result: 'Resultado.',
  cancelled: 'Duelo cancelado.',
};

export function situacaoDaPlateia(estado: DuelState, plateia: Plateia): Situacao {
  const emVotacao = estado === 'voting';
  const podeVotar = emVotacao && plateia.logado && plateia.jaVotou === null;

  return {
    podeVotar,
    podeFalar: plateia.logado,
    // Só conta como parede quando há o que fazer do outro lado dela.
    precisaEntrar: emVotacao && !plateia.logado,
    mostraPlacar: estado === 'result',
    aoVivo: NO_AR.has(estado),
    chamada: chamadaDe(estado, plateia, emVotacao),
  };
}

function chamadaDe(estado: DuelState, plateia: Plateia, emVotacao: boolean): string {
  if (emVotacao && plateia.jaVotou !== null) {
    return 'Voto registrado. O resultado sai quando a janela fechar.';
  }
  if (emVotacao && !plateia.logado) {
    return 'Votação aberta. Entre para votar — assistir não pede conta, votar pede.';
  }
  if (estado === 'running' && !plateia.temVideo) {
    return 'O duelo está rodando, mas ainda não há vídeo saindo daqui.';
  }
  return CHAMADA[estado];
}

/**
 * O que a pessoa lê quando o voto não entra.
 *
 * Cada frase diz o que aconteceu e o que fazer, como em `publicacao.ts` —
 * devolver o código do erro empurra a pessoa para fora do duelo.
 */
export const MENSAGEM_DO_VOTO: Record<string, string> = {
  sem_sessao: 'Entre para votar. Assistir não pede conta; votar pede.',
  conta_suspensa: 'Esta conta está suspensa e não pode votar.',
  votacao_fechada: 'A janela de votação já fechou.',
  ja_votou: 'Você já votou neste duelo. Uma conta, um voto.',
  duelo_nao_encontrado: 'Esse duelo não existe mais.',
  voto_invalido: 'Voto inválido.',
};

export function mensagemDoVoto(erro: string | null): string {
  if (erro === null) return '';
  return MENSAGEM_DO_VOTO[erro] ?? 'Não consegui registrar seu voto. Tente de novo.';
}
