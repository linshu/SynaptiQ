import { useState, useRef } from 'react'

const loadScript = src =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.onload = resolve
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })

export default function FileLoader({ onFile, onError }) {
  const [dragging, setDragging] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [oneDriveLoading, setOneDriveLoading] = useState(false)
  const [odFiles, setOdFiles] = useState(null)   // { files, token }
  const fileInputRef = useRef()

  const readFile = file => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => onFile(e.target.result)
    reader.onerror = () => onError('Failed to read file')
    reader.readAsText(file)
  }

  // ── Local ──────────────────────────────────────────────────────────────────
  const handleDrop = e => {
    e.preventDefault()
    setDragging(false)
    readFile(e.dataTransfer.files[0])
  }

  const handleFileInput = e => readFile(e.target.files[0])

  // ── Google Drive ───────────────────────────────────────────────────────────
  const handleGoogleDrive = async () => {
    setGoogleLoading(true)
    try {
      await loadScript('https://accounts.google.com/gsi/client')
      await loadScript('https://apis.google.com/js/api.js')

      const token = await new Promise((resolve, reject) => {
        /* global google */
        const client = google.accounts.oauth2.initTokenClient({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive.readonly',
          callback: resp => {
            if (resp.error) reject(new Error(resp.error))
            else resolve(resp.access_token)
          },
        })
        client.requestAccessToken()
      })

      await new Promise(resolve => {
        /* global gapi */
        gapi.load('picker', resolve)
      })

      const picker = new google.picker.PickerBuilder()
        .addView(
          new google.picker.DocsView().setMimeTypes('text/csv,application/csv,text/plain')
        )
        .setOAuthToken(token)
        .setDeveloperKey(import.meta.env.VITE_GOOGLE_API_KEY)
        .setCallback(async data => {
          if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
            const fileId = data[google.picker.Response.DOCUMENTS][0][google.picker.Document.ID]
            const res = await fetch(
              `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            const text = await res.text()
            onFile(text)
          }
        })
        .build()
      picker.setVisible(true)
    } catch (e) {
      onError('Google Drive: ' + e.message)
    } finally {
      setGoogleLoading(false)
    }
  }

  // ── OneDrive ───────────────────────────────────────────────────────────────
  const handleOneDrive = async () => {
    setOneDriveLoading(true)
    try {
      await loadScript('https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js')

      /* global msal */
      const msalInstance = new msal.PublicClientApplication({
        auth: {
          clientId: import.meta.env.VITE_MS_CLIENT_ID,
          redirectUri: window.location.origin,
        },
      })
      await msalInstance.initialize()

      const authResult = await msalInstance.loginPopup({ scopes: ['Files.Read'] })
      const token = authResult.accessToken

      const res = await fetch(
        "https://graph.microsoft.com/v1.0/me/drive/root/search(q='.csv')?$select=name,id,size&$top=50",
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      const files = (data.value || []).filter(f => f.name.toLowerCase().endsWith('.csv'))

      if (files.length === 0) throw new Error('No CSV files found in your OneDrive')
      setOdFiles({ files, token })
    } catch (e) {
      onError('OneDrive: ' + e.message)
    } finally {
      setOneDriveLoading(false)
    }
  }

  const selectOdFile = async file => {
    const { token } = odFiles
    setOdFiles(null)
    try {
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/items/${file.id}/content`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const text = await res.text()
      onFile(text)
    } catch (e) {
      onError('Failed to download from OneDrive: ' + e.message)
    }
  }

  return (
    <section className="file-loader">
      <h2>Load Spike CSV</h2>
      <div className="loader-panels">

        {/* Local file */}
        <div className="loader-panel">
          <div className="panel-label">Local File</div>
          <div
            className={`drop-zone${dragging ? ' dragging' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
          >
            <span className="drop-icon">📂</span>
            <span>Drop CSV here or click to browse</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={handleFileInput}
            />
          </div>
        </div>

        {/* Google Drive */}
        <div className="loader-panel">
          <div className="panel-label">Google Drive</div>
          <button
            className="btn btn-cloud"
            onClick={handleGoogleDrive}
            disabled={googleLoading}
          >
            <span className="cloud-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12 2C9.24 2 7 4.24 7 7c0 .34.04.67.1 1H7C4.24 8 2 10.24 2 13s2.24 5 5 5h10c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96C16.45 5.69 14.41 4 12 4z"/>
              </svg>
            </span>
            {googleLoading ? 'Opening...' : 'Open from Google Drive'}
          </button>
        </div>

        {/* OneDrive */}
        <div className="loader-panel">
          <div className="panel-label">OneDrive</div>
          <button
            className="btn btn-cloud"
            onClick={handleOneDrive}
            disabled={oneDriveLoading}
          >
            <span className="cloud-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
              </svg>
            </span>
            {oneDriveLoading ? 'Opening...' : 'Open from OneDrive'}
          </button>
        </div>
      </div>

      {/* OneDrive file picker modal */}
      {odFiles && (
        <div className="modal-overlay" onClick={() => setOdFiles(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span>Select a CSV file</span>
              <button className="modal-close" onClick={() => setOdFiles(null)}>✕</button>
            </div>
            <ul className="od-file-list">
              {odFiles.files.map(f => (
                <li key={f.id}>
                  <button className="od-file-btn" onClick={() => selectOdFile(f)}>
                    <span className="od-file-icon">📄</span>
                    <span className="od-file-name">{f.name}</span>
                    {f.size && (
                      <span className="od-file-size">{(f.size / 1024).toFixed(1)} KB</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}
