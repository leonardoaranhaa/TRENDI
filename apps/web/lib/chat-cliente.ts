import type { ChatMessage, ClientMessage, ServerMessage } from '@trendi/shared';

/**
 * O chat do duelo visto do navegador (C-06).
 *
 * O servidor de tempo real (C-07) existe e é testado desde então, mas nunca
 * tinha recebido conexão de navegador nenhuma — este arquivo é a outra ponta.
 *
 * Cookie não entra aqui. O cliente está num domínio e o tempo real em outro,
 * e navegador não manda cookie de terceiro em `wss://`: a entrada é por
 * ticket assinado, pedido à API (decisão D-16). Por isso o endereço precisa
 * ser público — `NEXT_PUBLIC_REALTIME_URL` —, e não passa pelo rewrite de
 * `/api/*`, que só reescreve HTTP.
 */

export const REALTIME_URL = process.env['NEXT_PUBLIC_REALTIME_URL'] ?? 'ws://localhost:3002';

export interface ChatCallbacks {
  /** Histórico e mensagens novas chegam pelo mesmo caminho. */
  readonly aoReceber: (mensagens: ChatMessage[]) => void;
  /** O duelo mudou de estado — quem avisa é a sala, não o relógio da tela. */
  readonly aoMudarEstado?: (estado: string) => void;
  readonly aoFechar?: (motivo: string | null) => void;
}

export interface Chat {
  enviar(texto: string): void;
  fechar(): void;
}

/**
 * Abre o chat de um duelo.
 *
 * Quem não tem sessão não chega aqui: o ticket exige conta. Visitante assiste
 * o duelo e lê o convite para entrar — foi a escolha da porta do estádio.
 */
export async function abrirChat(duelId: string, callbacks: ChatCallbacks): Promise<Chat> {
  const ticket = await pedirTicket(duelId);
  const socket = new WebSocket(`${REALTIME_URL}?ticket=${encodeURIComponent(ticket)}`);

  socket.addEventListener('open', () => {
    enviarBruto(socket, { type: 'join', duelId });
  });

  socket.addEventListener('message', (evento) => {
    const mensagem = interpretar(String(evento.data));
    if (mensagem === null) return;

    if (mensagem.type === 'history') callbacks.aoReceber(mensagem.messages);
    if (mensagem.type === 'message') callbacks.aoReceber([mensagem.message]);
    if (mensagem.type === 'state') callbacks.aoMudarEstado?.(mensagem.state);
    if (mensagem.type === 'error') callbacks.aoFechar?.(mensagem.reason);
  });

  socket.addEventListener('close', () => callbacks.aoFechar?.(null));

  return {
    enviar(texto: string) {
      const corpo = texto.trim();
      if (corpo === '' || socket.readyState !== WebSocket.OPEN) return;
      enviarBruto(socket, { type: 'message', body: corpo });
    },
    fechar() {
      socket.close();
    },
  };
}

/** O ticket vale minutos e é de um duelo só. Pedir de novo é barato. */
async function pedirTicket(duelId: string): Promise<string> {
  const resposta = await fetch('/api/auth/realtime-ticket', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ duelId }),
  });
  if (!resposta.ok) throw new Error('sem_ticket');
  return ((await resposta.json()) as { ticket: string }).ticket;
}

function enviarBruto(socket: WebSocket, mensagem: ClientMessage): void {
  socket.send(JSON.stringify(mensagem));
}

function interpretar(bruto: string): ServerMessage | null {
  try {
    return JSON.parse(bruto) as ServerMessage;
  } catch {
    // Mensagem quebrada do servidor não pode derrubar o estádio: quem está
    // assistindo continua assistindo.
    return null;
  }
}
