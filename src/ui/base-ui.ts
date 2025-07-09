import { FEATURE_FLAG } from '../feature-flags';

export abstract class Base {
  protected container: Element;

  constructor(container: Element | undefined = undefined, draggable = false) {
    if (!container) {
      return;
    }

    this.container = container;
    if (FEATURE_FLAG.ENABLE_DRAGGABLE_WINDOWS && draggable) {
      this.container.setAttribute('draggable', 'true');

      // Custom mouse drag logic for smooth dragging
      let isDragging = false;
      let offsetX = 0;
      let offsetY = 0;

      const onMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return;
        isDragging = true;
        const rect = (this.container as HTMLElement).getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        (this.container as HTMLElement).style.transition = 'none';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const el = this.container as HTMLElement;
        el.style.left = `${e.clientX - offsetX}px`;
        el.style.top = `${e.clientY - offsetY}px`;
        el.style.right = 'auto';
        el.style.bottom = 'auto';
        el.style.position = 'absolute';
      };

      const onMouseUp = () => {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      this.container.addEventListener('mousedown', onMouseDown);
    }
  }

  show() {
    this.container.classList.remove('hidden');
  }

  hide() {
    this.container.classList.add('hidden');
  }

  toggle() {
    if (this.container.classList.contains('hidden')) {
      this.show();
    } else {
      this.hide();
    }
  }
}
