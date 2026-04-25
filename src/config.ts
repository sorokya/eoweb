import { HOST } from '@/consts';

type Config = {
  host: string;
  staticHost: boolean;
  title: string;
  creditsUrl: string;
  soundFont: string;
};

export function getDefaultConfig(): Config {
  return {
    host: HOST,
    staticHost: false,
    title: 'EO Web Client',
    creditsUrl: 'https://github.com/sorokya/eoweb',
    soundFont: 'TimGM6mb.sf2',
  };
}

export async function loadConfig(): Promise<Config> {
  try {
    const response = await fetch('/config.json');
    if (!response.ok) {
      return getDefaultConfig();
    }

    const config = await response.json();
    return config;
  } catch (_err) {
    return getDefaultConfig();
  }
}
