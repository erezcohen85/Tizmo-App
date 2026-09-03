import { toast } from 'sonner'

/** Success toast that auto-dismisses in 3s, with an optional Undo action. */
export function toastSuccess(message: string, undo?: { label: string; onUndo: () => void | Promise<void> }) {
  toast.success(message, {
    duration: 3000,
    action: undo
      ? {
          label: undo.label,
          onClick: () => {
            void undo.onUndo()
          },
        }
      : undefined,
  })
}
