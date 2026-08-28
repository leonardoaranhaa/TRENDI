import type { WebSocket } from 'ws';
import type { Stand } from '@trendi/shared';
import type { ServerMessage } from '@trendi/shared';

/**
 * Salas do tempo real.
 *
 * Uma sala por duelo, com todo mundo junto — é o chat único da C-07. A
 * arquibancada de cada pessoa já fica registrada aqui porque a C-11 divide
 * isto em três salas com escrita restrita, e aí só muda para quem o
 * `broadcast` entrega, não a estrutura.
 */

export interface Member {
  readonly socket: WebSocket;
  readonly userId: string;
  readonly handle: string;
  readonly stand: Stand;
  readonly duelId: string;
}

export class Rooms {
  private readonly byDuel = new Map<string, Set<Member>>();
  private readonly bySocket = new Map<WebSocket, Member>();

  join(member: Member): void {
    const room = this.byDuel.get(member.duelId) ?? new Set<Member>();
    room.add(member);
    this.byDuel.set(member.duelId, room);
    this.bySocket.set(member.socket, member);
  }

  leave(socket: WebSocket): Member | undefined {
    const member = this.bySocket.get(socket);
    if (member === undefined) return undefined;

    this.bySocket.delete(socket);
    const room = this.byDuel.get(member.duelId);
    room?.delete(member);
    if (room !== undefined && room.size === 0) this.byDuel.delete(member.duelId);
    return member;
  }

  memberOf(socket: WebSocket): Member | undefined {
    return this.bySocket.get(socket);
  }

  membersOf(duelId: string): Member[] {
    return [...(this.byDuel.get(duelId) ?? [])];
  }

  /** Manda para todo mundo da sala. Socket que já morreu é ignorado. */
  broadcast(duelId: string, message: ServerMessage): void {
    const payload = JSON.stringify(message);
    for (const member of this.byDuel.get(duelId) ?? []) {
      if (member.socket.readyState === member.socket.OPEN) member.socket.send(payload);
    }
  }

  get roomCount(): number {
    return this.byDuel.size;
  }
}

export function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}
