import { useState } from 'react'
import FileLoader from './components/FileLoader'
import ResultsTable from './components/ResultsTable'
import DownloadButton from './components/DownloadButton'
import HistoryList from './components/HistoryList'
import { parseSpikeCsv } from './utils/parseSpikeCsv'
import './App.css'

export default function App() {
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [source, setSource] = useState('local')
  const [historyKey, setHistoryKey] = useState(0)

  const handleFile = (text, src = 'local') => {
    setError(null)
    setSaved(false)
    setSaveError(null)
    setSource(src)
    try {
      setResult(parseSpikeCsv(text))
    } catch (e) {
      setError(e.message)
      setResult(null)
    }
  }

  const handleSave = async () => {
    if (!result || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/save-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...result, source }),
      })
      if (!res.ok) throw new Error(await res.text())
      setSaved(true)
      setHistoryKey(k => k + 1)
    } catch (e) {
      setSaveError('Save failed: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <h1 className="app-title">SynaptiQ</h1>
          <p className="app-subtitle">MEA Spike Data Analyzer</p>
        </div>
      </header>

      <main className="app-main">
        <FileLoader
          onFile={handleFile}
          onError={msg => setError(msg)}
        />

        {error && <div className="alert alert-error">{error}</div>}

        {result && (
          <section className="results-section">
            <div className="summary-bar">
              <div className="summary-item">
                <span className="summary-label">Recording</span>
                <span className="summary-value">{result.recordingName}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Duration</span>
                <span className="summary-value">{result.durationS.toFixed(2)} s</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total Spikes</span>
                <span className="summary-value">{result.totalSpikes.toLocaleString()}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Active Wells</span>
                <span className="summary-value">{result.wells.length}</span>
              </div>
            </div>

            <ResultsTable wells={result.wells} />

            <div className="action-bar">
              <DownloadButton wells={result.wells} recordingName={result.recordingName} />
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || saved}
              >
                {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save to History'}
              </button>
            </div>

            {saveError && <div className="alert alert-error">{saveError}</div>}
          </section>
        )}

        <HistoryList refreshKey={historyKey} />
      </main>
    </div>
  )
}
