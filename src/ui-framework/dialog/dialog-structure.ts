import type {
  BaseDialogActionConfig,
  BaseDialogBodyContent,
  BaseDialogBodyContentPart,
} from './dialog-types';

function applyDialogClassNameTokens(
  element: HTMLElement,
  className?: string,
): void {
  if (!className) {
    return;
  }

  for (const token of className.split(/\s+/)) {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      continue;
    }

    element.classList.add(normalizedToken);
  }
}

function appendDialogBodyPart(
  bodyElement: HTMLDivElement,
  content: Node | string,
): void {
  if (typeof content === 'string') {
    bodyElement.append(document.createTextNode(content));
    return;
  }

  bodyElement.append(content);
}

export function createDialogTitleElement(title = ''): HTMLHeadingElement {
  const titleElement = document.createElement('h2');
  titleElement.classList.add('ui-framework-dialog__title');
  titleElement.textContent = title;
  if (!title.trim()) {
    titleElement.classList.add('ui-framework-dialog__title--hidden');
  }

  return titleElement;
}

export function createDialogBodyElement(): HTMLDivElement {
  const bodyElement = document.createElement('div');
  bodyElement.classList.add('ui-framework-dialog__body');
  return bodyElement;
}

export function createDialogFooterElement(): HTMLDivElement {
  const footerElement = document.createElement('div');
  footerElement.classList.add('ui-framework-dialog__footer');
  return footerElement;
}

export function createDialogButtonRowElement(): HTMLDivElement {
  const buttonRowElement = document.createElement('div');
  buttonRowElement.classList.add('ui-framework-dialog__button-row');
  return buttonRowElement;
}

export function createDialogActionButton(
  action: BaseDialogActionConfig,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add('ui-framework-dialog__button');
  if (action.kind) {
    button.classList.add(`ui-framework-dialog__button--${action.kind}`);
  }
  if (action.tone) {
    button.classList.add(`ui-framework-dialog__button--${action.tone}`);
  }
  applyDialogClassNameTokens(button, action.className);
  button.dataset.dialogActionId = action.id;
  button.textContent = action.label;
  button.disabled = Boolean(action.disabled);
  return button;
}

export function setDialogBodyElementContent(
  bodyElement: HTMLDivElement,
  content: BaseDialogBodyContent,
): void {
  bodyElement.replaceChildren();
  const contentParts: readonly BaseDialogBodyContentPart[] = Array.isArray(
    content,
  )
    ? content
    : [content];
  for (const contentPart of contentParts) {
    appendDialogBodyPart(bodyElement, contentPart);
  }
}

export function applyDialogClassNames(
  element: HTMLElement,
  className?: string,
): void {
  applyDialogClassNameTokens(element, className);
}
