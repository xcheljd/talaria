import { toast } from 'sonner';

/**
 * Clear-with-undo: the change happens immediately and the toast offers an
 * Undo button for a few seconds. Replaces "Are you sure?" dialogs for
 * clearing lists — fewer clicks, and a slip is one click to reverse.
 */
export function toastWithUndo(
  message: string,
  restore: () => void | Promise<void>,
  restoredMessage = 'Restored'
) {
  toast.success(message, {
    duration: 8000,
    action: {
      label: 'Undo',
      onClick: async () => {
        await restore();
        toast.success(restoredMessage);
      },
    },
  });
}
