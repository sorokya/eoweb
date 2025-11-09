import { HOST } from './consts';

type Config = {
  host: string;
  staticHost: boolean;
  title: string;
  slogan: string;
  creditsUrl: string;
};

export function getDefaultConfig(): Config {
  return {
    host: HOST,
    staticHost: false,
    title: 'EO Web Client',
    slogan: 'Web Edition!',
    creditsUrl: 'https://github.com/sorokya/eoweb',
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
