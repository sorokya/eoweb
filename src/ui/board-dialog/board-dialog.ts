import { AdminLevel, type BoardPostListing } from 'eolib';
import type { Client } from '../../client';
import { MAX_PLAYER_POSTS } from '../../consts';
import { DialogResourceID, EOResourceID } from '../../edf';
import { playSfxById, SfxId } from '../../sfx';
import { capitalize } from '../../utils/capitalize';
import { Base } from '../base-ui';

import './board-dialog.css';

enum State {
  List = 'list',
  ViewPost = 'view-post',
  CreatePost = 'create-post',
}

export class BoardDialog extends Base {
  private client: Client;
  protected container = document.getElementById('board')!;
  private dialogs = document.getElementById('dialogs');
  private cover = document.querySelector<HTMLDivElement>('#cover');

  private txtTitle =
    this.container!.querySelector<HTMLSpanElement>('.board-title');

  // List state
  private postList =
    this.container!.querySelector<HTMLDivElement>('.post-list');
  private scrollHandle =
    this.container!.querySelector<HTMLDivElement>('.scroll-handle');
  private btnAdd = this.container!.querySelector<HTMLButtonElement>(
    '.list-buttons button[data-id="add"]',
  );
  private btnCancel = this.container!.querySelector<HTMLButtonElement>(
    '.list-buttons button[data-id="cancel"]',
  );

  // View post state
  private postSubjectView =
    this.container!.querySelector<HTMLInputElement>('.post-subject-view');
  private postBody =
    this.container!.querySelector<HTMLDivElement>('.post-body');
  private btnDelete = this.container!.querySelector<HTMLButtonElement>(
    '.view-buttons button[data-id="delete"]',
  );
  private btnBack = this.container!.querySelector<HTMLButtonElement>(
    '.view-buttons button[data-id="back"]',
  );

  // Create post state
  private createSubject =
    this.container!.querySelector<HTMLInputElement>('.create-subject');
  private createBody =
    this.container!.querySelector<HTMLTextAreaElement>('.create-body');
  private btnOk = this.container!.querySelector<HTMLButtonElement>(
    '.create-buttons button[data-id="ok"]',
  );
  private btnCancelCreate = this.container!.querySelector<HTMLButtonElement>(
    '.create-buttons button[data-id="cancel"]',
  );

  private state: State = State.List;
  private posts: BoardPostListing[] = [];
  private activePostId = 0;

  constructor(client: Client) {
    super();
    this.client = client;

    this.btnCancel!.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.hide();
    });

    this.btnAdd!.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      const playerPosts = this.posts.filter(
        (p) => p.author.toLowerCase() === this.client.name.toLowerCase(),
      );
      if (playerPosts.length >= MAX_PLAYER_POSTS) {
        const strings = this.client.getDialogStrings(
          DialogResourceID.BOARD_ERROR_TOO_MANY_MESSAGES,
        );
        if (strings) {
          this.client.emit('smallAlert', {
            title: strings[0],
            message: strings[1],
          });
        }
        return;
      }
      this.changeState(State.CreatePost);
    });

    this.btnBack!.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.changeState(State.List);
    });

    this.btnDelete!.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.client.board.deletePost(this.activePostId);
      this.changeState(State.List);
    });

    this.btnOk!.addEventListener('click', () => {
      // Play sfx before validation so the click is heard even if validation fails
      playSfxById(SfxId.ButtonClick);

      const subject = this.createSubject!.value.trim();
      const body = this.createBody!.value.trim();

      if (!subject) {
        const strings = this.client.getDialogStrings(
          DialogResourceID.BOARD_ERROR_NO_SUBJECT,
        );
        if (strings) {
          this.client.emit('smallAlert', {
            title: strings[0],
            message: strings[1],
          });
        }
        return;
      }

      if (!body) {
        const strings = this.client.getDialogStrings(
          DialogResourceID.BOARD_ERROR_NO_MESSAGE,
        );
        if (strings) {
          this.client.emit('smallAlert', {
            title: strings[0],
            message: strings[1],
          });
        }
        return;
      }

      this.client.board.createPost(subject, body);
      this.hide();
    });

    this.btnCancelCreate!.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.changeState(State.List);
    });

    const createFormElements = [this.createSubject, this.createBody];
    for (const [index, element] of createFormElements.entries()) {
      element!.addEventListener('keydown', (evt) => {
        const e = evt as KeyboardEvent;
        if (e.key === 'Tab' && this.state === State.CreatePost) {
          e.preventDefault();
          if (e.shiftKey) {
            const prevIndex =
              index === 0 ? createFormElements.length - 1 : index - 1;
            createFormElements[prevIndex]!.focus();
          } else {
            const nextIndex =
              index === createFormElements.length - 1 ? 0 : index + 1;
            createFormElements[nextIndex]!.focus();
          }
        }
      });
    }

    this.postList!.addEventListener('scroll', () => {
      this.setScrollThumbPosition();
    });

    this.scrollHandle!.addEventListener('pointerdown', () => {
      const onPointerMove = (e: PointerEvent) => {
        const rect = this.postList!.getBoundingClientRect();
        const min = 30;
        const max = 212;
        const clampedY = Math.min(
          Math.max(e.clientY, rect.top + min),
          rect.top + max,
        );
        const scrollPercent = (clampedY - rect.top - min) / (max - min);
        this.postList!.scrollTop =
          scrollPercent *
          (this.postList!.scrollHeight - this.postList!.clientHeight);
      };

      const onPointerUp = () => {
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    });

    this.client.on('postRead', ({ postId, body }) => {
      if (this.state !== State.ViewPost || this.activePostId !== postId) return;
      this.postBody!.innerText = body;
    });
  }

  setData(posts: BoardPostListing[]) {
    this.posts = posts;
    this.changeState(State.List);
  }

  show() {
    this.cover!.classList.remove('hidden');
    this.container!.classList.remove('hidden');
    this.dialogs!.classList.remove('hidden');
    this.client.typing = true;
    this.setScrollThumbPosition();
  }

  hide() {
    this.cover!.classList.add('hidden');
    this.container!.classList.add('hidden');

    if (!document.querySelector('#dialogs > div:not(.hidden)')) {
      this.dialogs!.classList.add('hidden');
      this.client.typing = false;
    }
  }

  private changeState(state: State) {
    this.state = state;
    this.container!.dataset.state = state;
    this.render();
  }

  private setScrollThumbPosition() {
    const min = 60;
    const max = 212;
    const scrollTop = this.postList!.scrollTop;
    const scrollHeight = this.postList!.scrollHeight;
    const clientHeight = this.postList!.clientHeight;
    const scrollPercent = scrollTop / (scrollHeight - clientHeight);
    const clampedPercent = Math.min(Math.max(scrollPercent, 0), 1);
    const top = min + (max - min) * clampedPercent || min;
    this.scrollHandle!.style.top = `${top}px`;
  }

  private render() {
    switch (this.state) {
      case State.List:
        this.renderList();
        break;
      case State.ViewPost:
        this.renderViewPost();
        break;
      case State.CreatePost:
        this.renderCreatePost();
        break;
    }
  }

  private renderList() {
    this.txtTitle!.innerText =
      this.client.getResourceString(EOResourceID.BOARD_TOWN_BOARD) ??
      'Town Board';
    this.postList!.innerHTML = '';

    for (const post of this.posts) {
      const item = document.createElement('div');
      item.className = 'post-item';

      const authorEl = document.createElement('span');
      authorEl.className = 'post-author';
      authorEl.innerText = capitalize(post.author);

      const subjectEl = document.createElement('span');
      subjectEl.className = 'post-subject-text';
      subjectEl.innerText = post.subject;

      item.appendChild(authorEl);
      item.appendChild(subjectEl);

      const onClick = () => {
        this.activePostId = post.postId;
        this.postSubjectView!.value = post.subject;
        this.postBody!.innerText =
          this.client.getResourceString(EOResourceID.BOARD_LOADING_MESSAGE) ??
          'Loading...';

        const isOwner =
          post.author.toLowerCase() === this.client.name.toLowerCase() ||
          this.client.admin !== AdminLevel.Player;
        this.btnDelete!.classList.toggle('hidden', !isOwner);

        this.client.board.readPost(post.postId);
        this.changeState(State.ViewPost);
      };

      item.addEventListener('click', onClick);
      item.addEventListener('contextmenu', onClick);
      this.postList!.appendChild(item);
    }

    this.setScrollThumbPosition();
  }

  private renderViewPost() {
    const post = this.posts.find((p) => p.postId === this.activePostId);
    this.txtTitle!.innerText = capitalize(post?.author ?? '');
  }

  private renderCreatePost() {
    this.txtTitle!.innerText =
      this.client.getResourceString(EOResourceID.BOARD_POSTING_NEW_MESSAGE) ??
      'Posting New Message';
    this.createSubject!.value = '';
    this.createBody!.value = '';
    this.createSubject!.focus();
  }
}
