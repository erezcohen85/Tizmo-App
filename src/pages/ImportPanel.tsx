import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EnsembleSelect } from '@/components/EnsembleSelect'
import { useI18n } from '@/i18n'
import { todayISO } from '@/lib/dates'
import { downloadDriveFile, getAccessToken, isGoogleDriveConfigured, openDrivePicker } from '@/lib/googleDrive'
import {
  autoMapColumns,
  chunk,
  extractSheet,
  mapRows,
  parseWorkbook,
  type ColumnKey,
  type ParsedSheet,
} from '@/lib/importParse'
import { supabase } from '@/lib/supabase'
import { toastSuccess } from '@/lib/toastUndo'
import type { WorkBook } from 'xlsx'
import { useEnsembles } from '@/queries/ensembles'
import { useImportStudents } from '@/queries/students'

const COLUMNS: ColumnKey[] = ['first_name', 'last_name', 'instrument', 'grade']

export default function ImportPanel({ onDone }: { onDone?: () => void } = {}) {
  const { t } = useI18n()
  const { data: ensembles } = useEnsembles()
  const importStudents = useImportStudents()

  const [ensembleId, setEnsembleId] = useState<string | undefined>(undefined)
  const [joinedOn, setJoinedOn] = useState(todayISO())
  const [workbook, setWorkbook] = useState<WorkBook | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [sheetName, setSheetName] = useState<string | undefined>(undefined)
  const [sheet, setSheet] = useState<ParsedSheet | null>(null)
  const [mapping, setMapping] = useState<Partial<Record<ColumnKey, number>>>({})
  const [splitFullName, setSplitFullName] = useState(false)
  const [progress, setProgress] = useState<{ total: number; done: number } | null>(null)
  const [result, setResult] = useState<{ inserted: number; linked: number; skipped: number; invalid: number } | null>(null)

  const [driveLoading, setDriveLoading] = useState(false)

  function loadSheet(wb: WorkBook, name: string) {
    const parsed = extractSheet(wb, name)
    setSheetName(name)
    setSheet(parsed)
    setMapping(autoMapColumns(parsed.headers))
    setResult(null)
  }

  async function handleFile(file: File) {
    const { workbook: wb, sheetNames: names } = await parseWorkbook(file)
    setWorkbook(wb)
    setSheetNames(names)
    loadSheet(wb, names[0])
  }

  async function handlePickFromDrive() {
    setDriveLoading(true)
    try {
      const token = await getAccessToken()
      const picked = await openDrivePicker(token)
      if (!picked) return
      const file = await downloadDriveFile(picked, token)
      await handleFile(file)
    } catch (err) {
      console.error('Google Drive import failed:', err)
      toast.error(t('errors.saveFailed'))
    } finally {
      setDriveLoading(false)
    }
  }

  const mapped = sheet ? mapRows(sheet.rows, mapping, splitFullName) : []
  const invalidCount = mapped.filter((r) => !r.valid).length

  function resetForm() {
    setWorkbook(null)
    setSheetNames([])
    setSheetName(undefined)
    setSheet(null)
    setMapping({})
    setResult(null)
  }

  async function handleImport() {
    if (!ensembleId || !sheet) return
    const targetEnsembleId = ensembleId
    const valid = mapped.filter((r) => r.valid)
    const chunks = chunk(valid, 500)
    setProgress({ total: valid.length, done: 0 })
    const totals = { inserted: 0, linked: 0, skipped: 0, invalid: invalidCount }
    const insertedIds: string[] = []
    const linkedIds: string[] = []
    let failed = false
    for (const c of chunks) {
      try {
        const res = await importStudents.mutateAsync({ ensembleId, joinedOn, rows: c })
        totals.inserted += res.inserted
        totals.linked += res.linked
        totals.skipped += res.skipped
        totals.invalid += res.invalid
        insertedIds.push(...res.inserted_ids)
        linkedIds.push(...res.linked_ids)
        setProgress((p) => (p ? { ...p, done: p.done + c.length } : null))
      } catch {
        toast.error(t('errors.saveFailed'))
        failed = true
        break
      }
    }
    setProgress(null)

    if (!failed) {
      resetForm()
      onDone?.()
      const summary = `${totals.inserted} ${t('import.inserted')} · ${totals.linked} ${t('import.linked')} · ${totals.skipped} ${t('import.skipped')} · ${totals.invalid} ${t('import.invalid')}`
      toastSuccess(`${t('toasts.importSuccess')} — ${summary}`, {
        label: t('common.undo'),
        onUndo: async () => {
          try {
            if (linkedIds.length) {
              await supabase
                .from('student_ensembles')
                .delete()
                .eq('ensemble_id', targetEnsembleId)
                .in('student_id', linkedIds)
            }
            if (insertedIds.length) {
              await supabase.from('students').delete().in('id', insertedIds)
            }
            toast.success(t('common.undone'))
          } catch {
            toast.error(t('errors.saveFailed'))
          }
        },
      })
    } else {
      setResult(totals)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium">{t('import.target')}</p>
        <EnsembleSelect ensembles={ensembles ?? []} value={ensembleId} onChange={setEnsembleId} />
        <Input type="date" value={joinedOn} onChange={(e) => setJoinedOn(e.target.value)} className="w-40" />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t('import.file')}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="max-w-xs"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {isGoogleDriveConfigured() ? (
            <Button type="button" variant="outline" size="sm" onClick={handlePickFromDrive} disabled={driveLoading}>
              {t('import.fromGoogleDrive')}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">{t('import.googleDriveNotConfigured')}</span>
          )}
        </div>
      </div>

      {sheet && (
        <>
          {sheetNames.length > 1 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('import.sheet')}</p>
              <Select value={sheetName} onValueChange={(v) => workbook && loadSheet(workbook, v)}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sheetNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">{t('import.mapColumns')}</p>
            {COLUMNS.map((col) => (
              <div key={col} className="flex items-center gap-2">
                <span className="w-24 text-sm">{col}</span>
                <Select
                  value={mapping[col] !== undefined ? String(mapping[col]) : '__none__'}
                  onValueChange={(v) => setMapping((m) => ({ ...m, [col]: v === '__none__' ? undefined : Number(v) }))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— none —</SelectItem>
                    {sheet.headers.map((h, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {h || `Column ${i + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            {mapping.first_name !== undefined && mapping.last_name === undefined && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={splitFullName} onChange={(e) => setSplitFullName(e.target.checked)} />
                {t('import.splitFullName')}
              </label>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              {t('import.preview')} ({mapped.length} rows, {invalidCount} {t('import.invalid')})
            </p>
            <div className="max-h-64 overflow-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>First</TableHead>
                    <TableHead>Last</TableHead>
                    <TableHead>Instrument</TableHead>
                    <TableHead>Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mapped.slice(0, 20).map((r, i) => (
                    <TableRow key={i} className={!r.valid ? 'bg-destructive/10' : undefined}>
                      <TableCell>{r.first_name}</TableCell>
                      <TableCell>{r.last_name}</TableCell>
                      <TableCell>{r.instrument}</TableCell>
                      <TableCell>{r.grade}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <Button onClick={handleImport} disabled={!ensembleId || !!progress}>
            {t('import.confirm')}
          </Button>

          {progress && (
            <p className="text-sm text-muted-foreground">
              {progress.done} / {progress.total}
            </p>
          )}

          {result && (
            <div className="rounded border p-3 text-sm">
              {result.inserted} {t('import.inserted')} · {result.linked} {t('import.linked')} · {result.skipped}{' '}
              {t('import.skipped')} · {result.invalid} {t('import.invalid')}
            </div>
          )}
        </>
      )}
    </div>
  )
}
