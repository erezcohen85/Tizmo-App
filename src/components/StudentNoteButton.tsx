import { useEffect, useRef, useState } from 'react'
import { MessageSquare, MessageSquareText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { useI18n } from '@/i18n'

export function StudentNoteButton({
  note,
  disabled,
  onSave,
}: {
  note: string | null
  disabled: boolean
  onSave: (note: string) => void
}) {
  const { t } = useI18n()
  const [value, setValue] = useState(note ?? '')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => setValue(note ?? ''), [note])

  const scheduleSave = (next: string) => {
    setValue(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onSave(next), 600)
  }

  const flush = () => {
    if (timer.current) clearTimeout(timer.current)
    onSave(value)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" disabled={disabled} aria-label={t('attendance.noteFor')}>
          {note ? <MessageSquareText className="size-4 text-primary" /> : <MessageSquare className="size-4 text-muted-foreground" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-2">
        {disabled ? (
          <p className="text-sm text-muted-foreground">{t('attendance.setStatusFirst')}</p>
        ) : (
          <Textarea
            value={value}
            onChange={(e) => scheduleSave(e.target.value)}
            onBlur={flush}
            rows={3}
            placeholder={t('attendance.noteFor')}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}
