import { Gender } from 'eolib';

type Offsets = {
  [Gender.Female]: {
    downRight: { x: number; y: number };
    upLeft: { x: number; y: number };
  }[];
  [Gender.Male]: {
    downRight: { x: number; y: number };
    upLeft: { x: number; y: number };
  }[];
};

type RenderOffset = {
  standing: Offsets;
  walking: Offsets;
  melee: Offsets;
  raisedHand: Offsets;
  chair: Offsets;
  ground: Offsets;
  ranged: Offsets;
};

export const HAIR_RENDER_OFFSETS: RenderOffset = {
  standing: {
    [Gender.Female]: [
      {
        downRight: { x: 0, y: 0 },
        upLeft: { x: 0, y: 0 },
      },
    ],
    [Gender.Male]: [
      {
        downRight: { x: 0, y: 0 },
        upLeft: { x: 0, y: 0 },
      },
    ],
  },
  walking: {
    [Gender.Female]: [
      {
        downRight: { x: 0, y: 0 },
        upLeft: { x: 0, y: 0 },
      },
    ],
    [Gender.Male]: [
      {
        downRight: { x: 0, y: 0 },
        upLeft: { x: 0, y: 0 },
      },
    ],
  },
  melee: {
    [Gender.Female]: [
      {
        downRight: { x: 0, y: 0 },
        upLeft: { x: 0, y: 0 },
      },
    ],
    [Gender.Male]: [
      {
        downRight: { x: 0, y: 0 },
        upLeft: { x: 0, y: 0 },
      },
    ],
  },
  raisedHand: {
    [Gender.Female]: [
      {
        downRight: { x: 0, y: 0 },
        upLeft: { x: 0, y: 0 },
      },
    ],
    [Gender.Male]: [
      {
        downRight: { x: 0, y: 0 },
        upLeft: { x: 0, y: 0 },
      },
    ],
  },
  chair: {
    [Gender.Female]: [
      {
        downRight: { x: 0, y: 0 },
        upLeft: { x: 0, y: 0 },
      },
    ],
    [Gender.Male]: [
      {
        downRight: { x: 0, y: 0 },
        upLeft: { x: 0, y: 0 },
      },
    ],
  },
  ground: {
    [Gender.Female]: [
      {
        downRight: { x: 0, y: 0 },
        upLeft: { x: 0, y: 0 },
      },
    ],
    [Gender.Male]: [
      {
        downRight: { x: 0, y: 0 },
        upLeft: { x: 0, y: 0 },
      },
    ],
  },
  ranged: {
    [Gender.Female]: [
      {
        downRight: { x: 0, y: 0 },
        upLeft: { x: 0, y: 0 },
      },
    ],
    [Gender.Male]: [
      {
        downRight: { x: 0, y: 0 },
        upLeft: { x: 0, y: 0 },
      },
    ],
  },
};
