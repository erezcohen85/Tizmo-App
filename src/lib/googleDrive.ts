const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY
const APP_ID = import.meta.env.VITE_GOOGLE_APP_ID

const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

const SPREADSHEET_MIME_TYPES = [
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
].join(',')

export function isGoogleDriveConfigured(): boolean {
  return Boolean(CLIENT_ID && API_KEY)
}

type PickerDoc = { id: string; name: string }
type PickerResponse = { action: string; docs?: PickerDoc[] }
type PickerView = {
  setMimeTypes: (mimeTypes: string) => PickerView
  setIncludeFolders: (v: boolean) => PickerView
}
type PickerBuilder = {
  addView: (view: PickerView) => PickerBuilder
  setOAuthToken: (token: string) => PickerBuilder
  setDeveloperKey: (key: string) => PickerBuilder
  setAppId: (appId: string) => PickerBuilder
  setCallback: (cb: (data: PickerResponse) => void) => PickerBuilder
  build: () => { setVisible: (v: boolean) => void }
}

type GoogleGlobal = {
  picker: {
    DocsView: new (viewId: unknown) => PickerView
    PickerBuilder: new () => PickerBuilder
    ViewId: { DOCS: unknown }
    Action: { PICKED: string; CANCEL: string }
  }
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string
        scope: string
        callback: (resp: { access_token?: string; error?: string }) => void
      }) => { requestAccessToken: () => void }
    }
  }
}

declare global {
  interface Window {
    gapi: { load: (api: string, callback: () => void) => void }
    google: GoogleGlobal
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`failed to load ${src}`))
    document.head.appendChild(script)
  })
}

let gapiPickerLoaded: Promise<void> | null = null

function loadGapiPicker(): Promise<void> {
  if (!gapiPickerLoaded) {
    gapiPickerLoaded = loadScript('https://apis.google.com/js/api.js').then(
      () =>
        new Promise((resolve) => {
          window.gapi.load('picker', () => resolve())
        }),
    )
  }
  return gapiPickerLoaded
}

let gisLoaded: Promise<void> | null = null

function loadGis(): Promise<void> {
  if (!gisLoaded) {
    gisLoaded = loadScript('https://accounts.google.com/gsi/client')
  }
  return gisLoaded
}

let cachedToken: { token: string; expiresAt: number } | null = null

export async function getAccessToken(): Promise<string> {
  if (!CLIENT_ID) throw new Error('VITE_GOOGLE_CLIENT_ID not configured')
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token

  await loadGis()

  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: DRIVE_FILE_SCOPE,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error ?? 'no access token'))
          return
        }
        cachedToken = { token: resp.access_token, expiresAt: Date.now() + 55 * 60 * 1000 }
        resolve(resp.access_token)
      },
    })
    client.requestAccessToken()
  })
}

export async function openDrivePicker(accessToken: string): Promise<PickerDoc | null> {
  if (!API_KEY) throw new Error('VITE_GOOGLE_API_KEY not configured')
  await loadGapiPicker()

  return new Promise((resolve, reject) => {
    try {
      const { picker } = window.google
      const view = new picker.DocsView(picker.ViewId.DOCS)
        .setMimeTypes(SPREADSHEET_MIME_TYPES)
        .setIncludeFolders(true)

      let builder = new picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(API_KEY)
      if (APP_ID) builder = builder.setAppId(APP_ID)
      const instance = builder
        .setCallback((data: PickerResponse) => {
          if (data.action === picker.Action.PICKED && data.docs?.[0]) {
            resolve({ id: data.docs[0].id, name: data.docs[0].name })
          } else if (data.action === picker.Action.CANCEL) {
            resolve(null)
          }
        })
        .build()
      instance.setVisible(true)
    } catch (err) {
      reject(err instanceof Error ? err : new Error('picker failed'))
    }
  })
}

export async function downloadDriveFile(file: PickerDoc, accessToken: string): Promise<File> {
  const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?fields=mimeType`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!metaRes.ok) throw new Error('failed to read file metadata')
  const { mimeType } = (await metaRes.json()) as { mimeType: string }

  const isGoogleNative = mimeType === 'application/vnd.google-apps.spreadsheet'
  const url = isGoogleNative
    ? `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )}`
    : `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) throw new Error('failed to download file')

  const blob = await res.blob()
  const filename = isGoogleNative ? `${file.name}.xlsx` : file.name
  return new File([blob], filename, { type: blob.type })
}
