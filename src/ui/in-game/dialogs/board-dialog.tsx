import type { BoardPostListing } from 'eolib';
import { AdminLevel } from 'eolib';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { FaArrowLeft, FaPlus, FaTrash } from 'react-icons/fa';
import { Button } from '@/ui/components';
import { UI_PANEL_BORDER } from '@/ui/consts';
import { useClient, useLocale } from '@/ui/context';
import { DialogBase } from './dialog-base';

type BoardView = 'list' | 'view' | 'create';

type PostViewState = {
  post: BoardPostListing;
  body: string | null;
};

export function BoardDialog() {
  const client = useClient();
  const { locale } = useLocale();

  const [view, setView] = useState<BoardView>('list');
  const [posts, setPosts] = useState<BoardPostListing[]>(
    () => client.boardController.boardPosts,
  );
  const [postView, setPostView] = useState<PostViewState | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const isAdmin = client.admin >= AdminLevel.GameMaster;

  useEffect(() => {
    const handleBoardOpened = (newPosts: BoardPostListing[]) => {
      setPosts([...newPosts]);
      setView('list');
    };

    const handlePostRead = (postId: number, postBody: string) => {
      const post = client.boardController.boardPosts.find(
        (p) => p.postId === postId,
      );
      if (post) {
        setPostView({ post, body: postBody.replace(/\r/g, '\n') });
        setView('view');
      }
    };

    client.boardController.subscribeBoardOpened(handleBoardOpened);
    client.boardController.subscribePostRead(handlePostRead);

    return () => {
      client.boardController.unsubscribeBoardOpened(handleBoardOpened);
      client.boardController.unsubscribePostRead(handlePostRead);
    };
  }, [client]);

  const handleClickPost = useCallback(
    (post: BoardPostListing) => {
      setPostView({ post, body: null });
      client.boardController.readPost(post.postId);
    },
    [client],
  );

  const handleDelete = useCallback(
    (postId: number) => {
      client.alertController.showConfirm(
        locale.boardDeleteConfirmTitle,
        locale.boardDeleteConfirmMsg,
        (confirmed) => {
          if (!confirmed) return;
          client.boardController.deletePost(postId);
          if (view === 'view') setView('list');
        },
      );
    },
    [client, locale, view],
  );

  const handleSubmitPost = useCallback(() => {
    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();
    if (!trimmedSubject || !trimmedBody) return;
    client.boardController.createPost(trimmedSubject, trimmedBody);
    setSubject('');
    setBody('');
    setView('list');
  }, [client, subject, body]);

  return (
    <DialogBase id='board' title={locale.boardTitle} size='md'>
      <div class='flex flex-col'>
        {view === 'list' && (
          <>
            <div class='flex items-center justify-end px-2 pt-2 pb-1'>
              <Button
                variant={['xs', 'primary']}
                onClick={() => {
                  setSubject('');
                  setBody('');
                  setView('create');
                }}
              >
                <FaPlus size={10} />
                {locale.boardNewPost}
              </Button>
            </div>

            {posts.length === 0 ? (
              <p class='py-6 text-center text-base-content/50 text-sm'>
                {locale.boardNoPosts}
              </p>
            ) : (
              <div class='divide-y divide-base-content/10'>
                {posts.map((post) => (
                  <div
                    key={post.postId}
                    class='flex items-center gap-2 px-2 py-2'
                  >
                    <button
                      type='button'
                      class='min-w-0 flex-1 text-left'
                      onClick={() => handleClickPost(post)}
                    >
                      <p class='truncate font-medium text-sm leading-tight'>
                        {post.subject}
                      </p>
                      <p class='text-base-content/50 text-xs'>
                        {locale.boardPostBy.replace('{author}', post.author)}
                      </p>
                    </button>

                    {isAdmin && (
                      <div
                        role='presentation'
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant={['xs', 'error', 'outline']}
                          class='shrink-0'
                          onClick={() => handleDelete(post.postId)}
                          aria-label={locale.boardDeletePost}
                        >
                          <FaTrash size={10} />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {view === 'view' && postView && (
          <div class='flex flex-col gap-2 p-2'>
            <div class='flex items-start gap-2'>
              <Button
                variant={['xs', 'ghost']}
                onClick={() => setView('list')}
                aria-label={locale.boardPostBack}
              >
                <FaArrowLeft size={10} />
                {locale.boardPostBack}
              </Button>

              {isAdmin && (
                <Button
                  variant={['xs', 'error', 'outline']}
                  class='ml-auto'
                  onClick={() => handleDelete(postView.post.postId)}
                >
                  <FaTrash size={10} />
                  {locale.boardDeletePost}
                </Button>
              )}
            </div>

            <div>
              <p class='font-semibold text-sm leading-tight'>
                {postView.post.subject}
              </p>
              <p class='text-base-content/50 text-xs'>
                {locale.boardPostBy.replace('{author}', postView.post.author)}
              </p>
            </div>

            <div
              class={`min-h-20 rounded border ${UI_PANEL_BORDER} whitespace-pre-wrap bg-base-200 p-2 text-sm`}
            >
              {postView.body ?? '…'}
            </div>
          </div>
        )}

        {view === 'create' && (
          <div class='flex flex-col gap-2 p-2'>
            <div>
              <label
                for='board-subject'
                class='mb-1 block text-base-content/70 text-xs'
              >
                {locale.boardPostSubject}
              </label>
              <input
                id='board-subject'
                type='text'
                class={`input input-sm input-bordered w-full border ${UI_PANEL_BORDER}`}
                value={subject}
                onKeyDown={(e) => e.stopPropagation()}
                onInput={(e) =>
                  setSubject((e.target as HTMLInputElement).value)
                }
              />
            </div>

            <div>
              <label
                for='board-body'
                class='mb-1 block text-base-content/70 text-xs'
              >
                {locale.boardPostBody}
              </label>
              <textarea
                id='board-body'
                class={`textarea textarea-bordered w-full border ${UI_PANEL_BORDER} text-sm`}
                rows={6}
                value={body}
                onKeyDown={(e) => e.stopPropagation()}
                onInput={(e) =>
                  setBody((e.target as HTMLTextAreaElement).value)
                }
              />
            </div>

            <div class='flex gap-2'>
              <Button
                variant={['sm', 'ghost']}
                class='flex-1'
                onClick={() => setView('list')}
              >
                {locale.boardPostCancel}
              </Button>
              <Button
                variant={['sm', 'primary']}
                class='flex-1'
                disabled={!subject.trim() || !body.trim()}
                onClick={handleSubmitPost}
              >
                {locale.boardPostSubmit}
              </Button>
            </div>
          </div>
        )}
      </div>
    </DialogBase>
  );
}
