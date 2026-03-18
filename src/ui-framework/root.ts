export const UI_FRAMEWORK_ROOT_ID = 'ui-root';
export const UI_FRAMEWORK_DEFAULT_MOUNT_ID = 'default';

const UI_FRAMEWORK_MOUNT_ATTR = 'data-ui-framework-mount';

function normalizeIdentifier(id: string, label: string): string {
  const normalizedId = id.trim();
  if (!normalizedId) {
    throw new Error(`${label} cannot be empty.`);
  }

  return normalizedId;
}

function mountSelector(mountId: string): string {
  return `[${UI_FRAMEWORK_MOUNT_ATTR}="${mountId}"]`;
}

export function getUiFrameworkRoot(
  rootId = UI_FRAMEWORK_ROOT_ID,
): HTMLDivElement {
  const normalizedRootId = normalizeIdentifier(rootId, 'UI framework root id');
  const root = document.getElementById(normalizedRootId);
  if (!root) {
    throw new Error(
      `UI framework root "#${normalizedRootId}" could not be found.`,
    );
  }

  if (!(root instanceof HTMLDivElement)) {
    throw new Error(`UI framework root "#${normalizedRootId}" must be a div.`);
  }

  return root;
}

export function getUiFrameworkMount(
  root: ParentNode,
  mountId = UI_FRAMEWORK_DEFAULT_MOUNT_ID,
): HTMLDivElement | null {
  const normalizedMountId = normalizeIdentifier(
    mountId,
    'UI framework mount id',
  );

  return root.querySelector<HTMLDivElement>(mountSelector(normalizedMountId));
}

export function ensureUiFrameworkMount(
  root: HTMLDivElement,
  mountId = UI_FRAMEWORK_DEFAULT_MOUNT_ID,
): HTMLDivElement {
  const normalizedMountId = normalizeIdentifier(
    mountId,
    'UI framework mount id',
  );
  const existingMount = root.querySelector<HTMLDivElement>(
    mountSelector(normalizedMountId),
  );
  if (existingMount) {
    return existingMount;
  }

  const mount = document.createElement('div');
  mount.setAttribute(UI_FRAMEWORK_MOUNT_ATTR, normalizedMountId);
  root.appendChild(mount);
  return mount;
}
