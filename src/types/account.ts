import type { Gender } from 'eolib';

export type AccountCreateData = {
  username: string;
  password: string;
  name: string;
  location: string;
  email: string;
};

export type CharacterCreateData = {
  name: string;
  gender: Gender;
  hairStyle: number;
  hairColor: number;
  skin: number;
};
