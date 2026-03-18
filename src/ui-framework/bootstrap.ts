import {
  ensureUiFrameworkMount,
  getUiFrameworkRoot,
  UI_FRAMEWORK_DEFAULT_MOUNT_ID,
} from './root';
import type {
  UiFrameworkBootstrapOptions,
  UiFrameworkRuntime,
} from './types';
import { UIWindowManager } from './window-manager';

let activeRuntime: UiFrameworkRuntime | null = null;

export function bootstrapUiFramework(
  options: UiFrameworkBootstrapOptions = {},
): UiFrameworkRuntime {
  if (activeRuntime) {
    return activeRuntime;
  }

  const root = getUiFrameworkRoot(options.rootId);
  const getMount = (mountId = UI_FRAMEWORK_DEFAULT_MOUNT_ID): HTMLDivElement =>
    ensureUiFrameworkMount(root, mountId);
  const windowManager = new UIWindowManager({
    getMount,
    zIndexPolicy: options.zIndexPolicy,
  });

  const runtime: UiFrameworkRuntime = {
    root,
    surfaces: windowManager.surfaces,
    windowManager,
    getMount(mountId = UI_FRAMEWORK_DEFAULT_MOUNT_ID) {
      return getMount(mountId);
    },
    registerWindow(definition) {
      return windowManager.registerWindow(definition);
    },
    registerDialog(definition) {
      return windowManager.registerDialog(definition);
    },
  };

  runtime.getMount(UI_FRAMEWORK_DEFAULT_MOUNT_ID);
  root.dataset.uiFrameworkBootstrapped = 'true';
  activeRuntime = runtime;

  return runtime;
}

export function getUiFrameworkRuntime(): UiFrameworkRuntime {
  if (!activeRuntime) {
    throw new Error('UI framework has not been bootstrapped yet.');
  }

  return activeRuntime;
}
