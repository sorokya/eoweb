import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { EOResourceID } from '@/edf';
import { useClient, useLocale } from '@/ui/context';
import { capitalize } from '@/utils';
import { DialogBase } from './dialog-base';

export function JukeboxDialog() {
  const client = useClient();
  const { locale } = useLocale();

  const [songIndex, setSongIndex] = useState(
    client.jukeboxController.trackId - 1,
  );
  const [playerName, setPlayerName] = useState(
    client.jukeboxController.playerName,
  );

  useEffect(() => {
    const handleSongPlayed = (trackId: number) => {
      setPlayerName(locale.wordUnknown);
      setSongIndex(trackId - 1);
    };
    client.jukeboxController.subscribeSongPlayed(handleSongPlayed);

    const handleOpened = (player: string) => {
      if (player) {
        setPlayerName(capitalize(player));
      } else {
        setPlayerName('');
      }
    };
    client.jukeboxController.subscribeOpened(handleOpened);

    return () => {
      client.jukeboxController.unsubscribeSongPlayed(handleSongPlayed);
      client.jukeboxController.unsubscribeOpened(handleOpened);
    };
  }, [client, locale, capitalize]);

  const title = useMemo(() => {
    if (playerName) {
      return `${client.getResourceString(EOResourceID.JUKEBOX_PLAYING_REQUEST)} ${capitalize(playerName)}`;
    }
    return client.getResourceString(EOResourceID.JUKEBOX_IS_READY);
  }, [client, locale, playerName, capitalize]);

  const handlePlay = useCallback(
    (trackId: number) => {
      client.jukeboxController.requestSong(trackId);
    },
    [client],
  );

  return (
    <DialogBase id='jukebox' title={title} size='sm'>
      <div class='grid max-h-75'>
        <ul class='menu menu-sm overflow-y-auto p-1'>
          {client.jukeboxController.tracks.map((name, i) => (
            <li key={i}>
              <button
                type='button'
                class={i === songIndex ? 'active' : ''}
                onClick={() => handlePlay(i + 1)}
              >
                {name}
              </button>
            </li>
          ))}
          {client.jukeboxController.tracks.length === 0 && (
            <li class='menu-title text-center text-primary/60'>
              {locale.jukeboxNoSongs}
            </li>
          )}
        </ul>
      </div>
    </DialogBase>
  );
}
