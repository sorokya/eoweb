import { useCallback, useMemo, useState } from 'preact/hooks';
import { GameState } from '@/game-state';
import { Button, Confirm, Input } from '@/ui/components';
import { useClient, useLocale } from '@/ui/context';
import { capitalize } from '@/utils';

export function MainMenu() {
  const client = useClient();
  const [host, setHost] = useState(client.config.host);
  const { locale } = useLocale();
  const sessions = client.authenticationController.getSessions();
  const [deletingUsername, setDeletingUsername] = useState<string | null>(null);

  useMemo(() => {
    client.authenticationController.subscribeLoginFailed(() => {
      // Re-render will pick up updated sessions list
    });
  }, [client]);

  const sorted = useMemo(
    () => [...sessions].sort((a, b) => b.lastLoginAt - a.lastLoginAt),
    [sessions],
  );

  const viewCredits = useCallback(() => {
    window.open(client.config.creditsUrl, '_blank');
  }, [client.config.creditsUrl]);

  const createAccount = useCallback(() => {
    if (client.state === GameState.Initial) {
      client.connect(GameState.CreateAccount);
    } else {
      client.setState(GameState.CreateAccount);
    }
  }, [client]);

  const playGame = useCallback(() => {
    client.authenticationController.skipAutoLogin();
    if (client.state === GameState.Initial) {
      client.connect(GameState.Login);
    } else {
      client.setState(GameState.Login);
    }
  }, [client]);

  const playSession = useCallback(
    (username: string) => {
      const ok = client.authenticationController.selectSession(username);
      if (!ok) return;
      if (client.state === GameState.Initial) {
        client.connect(GameState.Login);
      } else {
        const didAuto = client.authenticationController.autoLogin();
        if (!didAuto) {
          client.setState(GameState.Login);
        }
      }
    },
    [client],
  );

  const requestDelete = useCallback((username: string) => {
    setDeletingUsername(username);
  }, []);

  const confirmDelete = useCallback(() => {
    if (deletingUsername) {
      client.authenticationController.removeSession(deletingUsername);
      setDeletingUsername(null);
    }
  }, [client, deletingUsername]);

  const cancelDelete = useCallback(() => {
    setDeletingUsername(null);
  }, []);

  const handleHostChange = useCallback(
    (value: string) => {
      setHost(value);
      client.config.host = value;
    },
    [client],
  );

  const formatLastLogin = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffMs / 86_400_000);

    if (diffMins < 1) return locale.selectSession.lastLoginJustNow;
    if (diffMins < 60)
      return locale.selectSession.lastLoginMinutesAgo.replace(
        '{0}',
        String(diffMins),
      );
    if (diffHours < 24)
      return locale.selectSession.lastLoginHoursAgo.replace(
        '{0}',
        String(diffHours),
      );
    if (diffDays < 7)
      return locale.selectSession.lastLoginDaysAgo.replace(
        '{0}',
        String(diffDays),
      );
    return d.toLocaleDateString();
  };

  return (
    <div class='flex h-full w-full flex-col items-center justify-center gap-4 align-center'>
      <img src='/logo.png' alt={locale.mainMenu.logoAlt} />
      <div class='flex flex-col gap-2'>
        {!client.config.staticHost && (
          <Input
            type='text'
            placeholder={locale.mainMenu.inputHost}
            value={host}
            onChange={(val) => handleHostChange(val)}
          />
        )}
        {sorted.length > 0 && (
          <div class='card bg-base-100 shadow-sm'>
            <div class='card-body p-4'>
              <div class='card-title text-sm'>{locale.selectSession.title}</div>
              <div class='flex flex-col gap-1'>
                {sorted.map((session) => (
                  <div
                    key={session.username}
                    class='flex items-center justify-between gap-3 rounded-lg bg-base-200 px-3 py-1.5'
                  >
                    <div class='flex flex-col'>
                      <span class='font-medium text-sm'>
                        {capitalize(session.username)}
                      </span>
                      <span class='text-xs opacity-60'>
                        {formatLastLogin(session.lastLoginAt)}
                      </span>
                    </div>
                    <div class='flex gap-1'>
                      <Button
                        variant={['primary', 'sm']}
                        onClick={() => playSession(session.username)}
                      >
                        {locale.selectSession.btnPlay}
                      </Button>
                      <Button
                        variant={['ghost', 'sm']}
                        onClick={() => requestDelete(session.username)}
                      >
                        {locale.selectSession.btnDelete}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <Button onClick={createAccount}>
          {locale.mainMenu.btnCreateAccount}
        </Button>
        <Button onClick={playGame}>{locale.mainMenu.btnLogin}</Button>
        <Button onClick={viewCredits}>{locale.mainMenu.btnViewCredits}</Button>
      </div>
      {deletingUsername && (
        <Confirm
          title={locale.selectSession.confirmDeleteTitle}
          message={locale.selectSession.confirmDelete.replace(
            '{0}',
            deletingUsername,
          )}
          onYes={confirmDelete}
          onNo={cancelDelete}
        />
      )}
    </div>
  );
}
