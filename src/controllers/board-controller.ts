import {
  BoardCreateClientPacket,
  BoardOpenClientPacket,
  BoardRemoveClientPacket,
  BoardTakeClientPacket,
} from 'eolib';

import type { Client } from '../client';

export class BoardController {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  openBoard(boardId: number): void {
    const packet = new BoardOpenClientPacket();
    packet.boardId = boardId;
    this.client.bus!.send(packet);
  }

  readPost(postId: number): void {
    const packet = new BoardTakeClientPacket();
    packet.boardId = this.client.boardId;
    packet.postId = postId;
    this.client.bus!.send(packet);
  }

  createPost(subject: string, body: string): void {
    const packet = new BoardCreateClientPacket();
    packet.boardId = this.client.boardId;
    packet.postSubject = subject;
    packet.postBody = body.replace(/\n/g, '\r');
    this.client.bus!.send(packet);
  }

  deletePost(postId: number): void {
    const packet = new BoardRemoveClientPacket();
    packet.boardId = this.client.boardId;
    packet.postId = postId;
    this.client.bus!.send(packet);
  }
}
