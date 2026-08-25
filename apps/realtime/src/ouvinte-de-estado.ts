import pg from 'pg';
import {
  DUEL_STATE_CHANNEL,
  parseDuelStateNotice,
  type DuelState,
} from '@trendi/shared';

/**
 * O ouvinte do aviso de estado (C-38).
 *
 * A API grava a transição e dispara `pg_notify` na mesma transação; quem
 * recebe é isto, e repassa para a sala do duelo. Sem ele, a janela de
 * votação abria na tela de cada pessoa quando a releitura periódica do
 * navegador dela calhasse de acontecer — e a janela dura 30 a 45 segundos.
 *
 * A conexão é dedicada e crua, não do Prisma: `LISTEN` ocupa a conexão pelo
 * tempo em que estiver escutando, e um pool a devolveria para outra consulta.
 */

export interface OuvinteDeEstado {
  fechar(): Promise<void>;
}

export interface OpcoesDoOuvinte {
  readonly connectionString: string;
  /** O que fazer com o aviso. Na prática, o `publishState` do servidor. */
  readonly aoMudarEstado: (duelId: string, state: DuelState) => void;
  readonly log?: (evento: Record<string, unknown>) => void;
  /** Espera inicial da reconexão, que dobra a cada tentativa. */
  readonly esperaInicialMs?: number;
  readonly esperaMaximaMs?: number;
}

const ESPERA_INICIAL_MS = 500;
const ESPERA_MAXIMA_MS = 30_000;

export function ouvirEstadoDosDuelos(opcoes: OpcoesDoOuvinte): OuvinteDeEstado {
  const log = opcoes.log ?? (() => undefined);
  const esperaInicial = opcoes.esperaInicialMs ?? ESPERA_INICIAL_MS;
  const esperaMaxima = opcoes.esperaMaximaMs ?? ESPERA_MAXIMA_MS;

  let cliente: pg.Client | null = null;
  let espera = esperaInicial;
  let relogio: NodeJS.Timeout | null = null;
  let fechado = false;

  async function conectar(): Promise<void> {
    if (fechado) return;

    const novo = new pg.Client({ connectionString: opcoes.connectionString });

    // Conexão de banco cai, e cai calada. Sem isto o tempo real pararia de
    // avisar sem ninguém perceber — que é pior do que nunca ter avisado,
    // porque a tela ficaria confiando num aviso que não vem mais.
    novo.on('error', (erro) => {
      log({ event: 'ouvinte_caiu', erro: erro.message });
      novo.removeAllListeners();
      if (cliente === novo) cliente = null;
      void novo.end().catch(() => undefined);
      agendarReconexao();
    });

    novo.on('notification', (aviso) => {
      const recado = parseDuelStateNotice(aviso.payload);
      // `NOTIFY` rodado à mão no banco não pode derrubar o tempo real.
      if (recado === null) {
        log({ event: 'aviso_ilegivel', payload: aviso.payload });
        return;
      }
      opcoes.aoMudarEstado(recado.duelId, recado.state);
    });

    try {
      await novo.connect();
      await novo.query(`LISTEN ${DUEL_STATE_CHANNEL}`);
      if (fechado) {
        await novo.end();
        return;
      }
      cliente = novo;
      espera = esperaInicial;
      log({ event: 'ouvindo_estado', canal: DUEL_STATE_CHANNEL });
    } catch (erro) {
      log({ event: 'ouvinte_nao_conectou', erro: (erro as Error).message });
      await novo.end().catch(() => undefined);
      agendarReconexao();
    }
  }

  function agendarReconexao(): void {
    if (fechado || relogio !== null) return;
    relogio = setTimeout(() => {
      relogio = null;
      espera = Math.min(espera * 2, esperaMaxima);
      void conectar();
    }, espera);
    relogio.unref();
  }

  void conectar();

  return {
    async fechar() {
      fechado = true;
      if (relogio !== null) clearTimeout(relogio);
      const atual = cliente;
      cliente = null;
      if (atual !== null) {
        atual.removeAllListeners();
        await atual.end().catch(() => undefined);
      }
    },
  };
}
