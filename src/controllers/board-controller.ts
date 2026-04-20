import {
  BoardCreateClientPacket,
  BoardOpenClientPacket,
  type BoardPostListing,
  BoardRemoveClientPacket,
  BoardTakeClientPacket,
} from 'eolib';

import type { Client } from '@/client';

type BoardOpenedSubscriber = (posts: BoardPostListing[]) => void;
type PostReadSubscriber = (postId: number, body: string) => void;

export class BoardController {
  private client: Client;
  boardId = 0;
  boardPosts: BoardPostListing[] = [];

  private boardOpenedSubscribers: BoardOpenedSubscriber[] = [];
  private postReadSubscribers: PostReadSubscriber[] = [];

  constructor(client: Client) {
    this.client = client;
  }

  subscribeBoardOpened(cb: BoardOpenedSubscriber): void {
    this.boardOpenedSubscribers.push(cb);
  }

  unsubscribeBoardOpened(cb: BoardOpenedSubscriber): void {
    this.boardOpenedSubscribers = this.boardOpenedSubscribers.filter(
      (s) => s !== cb,
    );
  }

  subscribePostRead(cb: PostReadSubscriber): void {
    this.postReadSubscribers.push(cb);
  }

  unsubscribePostRead(cb: PostReadSubscriber): void {
    this.postReadSubscribers = this.postReadSubscribers.filter((s) => s !== cb);
  }

  handleBoardOpened(boardId: number, posts: BoardPostListing[]): void {
    this.boardId = boardId;
    this.boardPosts = posts;
    for (const sub of this.boardOpenedSubscribers) sub(posts);
  }

  handlePostRead(postId: number, body: string): void {
    for (const sub of this.postReadSubscribers) sub(postId, body);
  }

  openBoard(boardId: number): void {
    const packet = new BoardOpenClientPacket();
    packet.boardId = boardId;
    this.client.bus!.send(packet);
  }

  readPost(postId: number): void {
    const packet = new BoardTakeClientPacket();
    packet.boardId = this.boardId;
    packet.postId = postId;
    this.client.bus!.send(packet);
  }

  createPost(subject: string, body: string): void {
    const packet = new BoardCreateClientPacket();
    packet.boardId = this.boardId;
    packet.postSubject = subject;
    packet.postBody = body.replace(/\n/g, '\r');
    this.client.bus!.send(packet);
  }

  deletePost(postId: number): void {
    const packet = new BoardRemoveClientPacket();
    packet.boardId = this.boardId;
    packet.postId = postId;
    this.client.bus!.send(packet);
  }
}
