export enum ToastType {
  Info = 0,
  Success = 1,
  Warning = 2,
  Error = 3,
}

export type ToastOptions = {
  type?: ToastType;
  message: string;
  icon?: string;
};
