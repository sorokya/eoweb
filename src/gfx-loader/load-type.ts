export const LoadType = {
  EGF: 1,
  DIB: 2,
} as const;

export type LoadType = (typeof LoadType)[keyof typeof LoadType];
