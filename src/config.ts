import { HOST } from './consts';

export type Config = {
  host: string;
  staticHost: boolean;
};

export function getDefaultConfig(): Config {
  return {
    host: HOST,
    staticHost: false,
  };
}

export async function loadConfig(): Promise<Config> {
  const response = await fetch('/config.json');
  if (!response.ok) {
    return getDefaultConfig();
  }

  return response.json();
}
