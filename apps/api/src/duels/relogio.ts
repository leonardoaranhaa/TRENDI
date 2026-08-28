import type { PrismaClient } from '@trendi/db';
import type { VideoProvider } from '@trendi/video';
import { DUEL_LIFECYCLE, PREPARATION_MS, isTerminal, type DuelState } from '@trendi/shared';
import { tickDuel } from './service.js';

/**
 * O relógio do duelo (C-40).
 *
 * Os prazos de cada estado estão escritos em `duel-state.ts` desde a C-08, e
 * até aqui **ninguém os aplicava**: o duelo só andava se um competidor
 * clicasse. O caso mais grave era a votação, que nunca fechava sozinha — e
 * então quem encerrava o julgamento era um dos julgados.
 *
 * Mora dentro da API, e não num processo novo, porque é aqui que já vivem a
 * transição, o movimento de mídia e o aviso ao tempo real (D-26). Processo a
 * mais é processo a mais para hospedar, sem nada em troca.
 *
 * ⚠️ Isto **não é a C-16**. A C-16 é fila e matchmaking, é Fase 2, e o que
 * ela faz é criar e parear duelos. O relógio só faz o duelo que já existe
 * respeitar o próprio prazo. Os dois andaram confundidos por um comentário
 * antigo, que dizia que o agendador "chega com a fila".
 */

/** De quanto em quanto tempo o relógio procura duelo vencido. */
export const INTERVALO_PADRAO_MS = 1000;

/**
 * Quantos duelos o relógio move por rodada.
 *
 * Teto de propósito: rodada que tenta mover tudo de uma vez segura a conexão
 * e atrasa justamente quando há mais gente assistindo.
 */
const POR_RODADA = 50;

/**
 * O menor prazo que existe, usado como filtro grosseiro na consulta.
 *
 * A duração de cada estado é regra e mora em `duel-state.ts` — em EXECUÇÃO
 * ela depende ainda do `chosen_duration_s` do duelo. Escrever isso em SQL
 * seria copiar a regra para o banco, o mesmo erro que a fórmula do voto
 * cruzado evita ficando num lugar só.
 *
 * Então o banco filtra grosso — "parado há mais tempo que o menor prazo que
 * existe" — e quem decide se venceu é `tick`, em TypeScript. Quando o volume
 * pedir, o filtro aperta sem a regra sair do lugar.
 */
const MENOR_PRAZO_MS = PREPARATION_MS;

/** Onde procurar: todo estado que não é fim de linha. */
const ESTADOS_VIVOS: DuelState[] = DUEL_LIFECYCLE.filter((estado) => !isTerminal(estado));

export interface Relogio {
  /** Uma rodada, à mão. Devolve quantos duelos andaram — é o que o teste usa. */
  rodada(now?: Date): Promise<number>;
  parar(): void;
}

export interface OpcoesDoRelogio {
  readonly prisma: PrismaClient;
  readonly video?: VideoProvider | undefined;
  /** 0 desliga o laço: a rodada continua chamável à mão. */
  readonly intervaloMs?: number;
  readonly log?: (evento: Record<string, unknown>) => void;
}

export function criarRelogio(opcoes: OpcoesDoRelogio): Relogio {
  const { prisma, video } = opcoes;
  const log = opcoes.log ?? (() => undefined);
  const intervalo = opcoes.intervaloMs ?? INTERVALO_PADRAO_MS;

  async function rodada(now = new Date()): Promise<number> {
    const limite = new Date(now.getTime() - MENOR_PRAZO_MS);

    const candidatos = await prisma.duel.findMany({
      where: { state: { in: ESTADOS_VIVOS }, stateEnteredAt: { lte: limite } },
      orderBy: { stateEnteredAt: 'asc' },
      take: POR_RODADA,
    });

    let andaram = 0;
    for (const duel of candidatos) {
      try {
        // `tickDuel` só grava se o duelo ainda estiver onde estava quando foi
        // lido. Duas instâncias da API no ar, ou o relógio contra um clique:
        // quem perder a corrida recebe `null` e segue adiante.
        if ((await tickDuel(prisma, duel, now, video)) !== null) andaram += 1;
      } catch (erro) {
        // Um duelo que falha não pode parar os outros — o resto da plateia
        // continua esperando o relógio.
        log({ event: 'relogio_falhou', duelId: duel.id, erro: (erro as Error).message });
      }
    }

    if (andaram > 0) log({ event: 'relogio_andou', duelos: andaram });
    return andaram;
  }

  const timer = intervalo > 0 ? setInterval(() => void rodada(), intervalo) : null;
  timer?.unref();

  return {
    rodada,
    parar: () => {
      if (timer !== null) clearInterval(timer);
    },
  };
}
