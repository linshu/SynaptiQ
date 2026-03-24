import { useState } from 'react'
import FileLoader from './components/FileLoader'
import ResultsTable from './components/ResultsTable'
import DownloadButton from './components/DownloadButton'
import HistoryList from './components/HistoryList'
import { parseSpikeCsv } from './utils/parseSpikeCsv'
import './App.css'

export default function App() {
  const [rawCsv, setRawCsv] = useState(null)
  const [isiThreshold, setIsiThreshold] = useState(0.1)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [source, setSource] = useState('local')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [historyKey, setHistoryKey] = useState(0)
  const [analysisName, setAnalysisName] = useState(null) // null = not prompting

  const analyze = (text, isi) => {
    setError(null)
    setSaved(false)
    setSaveError(null)
    try {
      setResult(parseSpikeCsv(text, isi))
    } catch (e) {
      setError(e.message)
      setResult(null)
    }
  }

  const handleFile = (text, src = 'local') => {
    setRawCsv(text)
    setSource(src)
    analyze(text, isiThreshold)
  }

  const handleIsiChange = val => {
    setIsiThreshold(val)
    if (rawCsv) analyze(rawCsv, val)
  }

  const handleSaveClick = () => {
    setAnalysisName(result.recordingName)
    setSaveError(null)
  }

  const handleSaveConfirm = async () => {
    if (!result || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/save-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...result, recordingName: analysisName, source }),
      })
      if (!res.ok) throw new Error(await res.text())
      setSaved(true)
      setAnalysisName(null)
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
        <FileLoader onFile={handleFile} onError={msg => setError(msg)} />

        <div className="isi-bar">
          <label className="isi-label" htmlFor="isi-input">
            ISI threshold for burst detection
          </label>
          <div className="isi-controls">
            <input
              id="isi-input"
              type="number"
              className="isi-input"
              value={isiThreshold}
              min={0.001}
              max={10}
              step={0.01}
              onChange={e => handleIsiChange(parseFloat(e.target.value) || 0.1)}
            />
            <span className="isi-unit">seconds</span>
          </div>
        </div>

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
              {!saved && analysisName === null && (
                <button className="btn btn-primary" onClick={handleSaveClick}>
                  Save to History
                </button>
              )}
              {saved && (
                <button className="btn btn-primary" disabled>✓ Saved</button>
              )}
            </div>

            {analysisName !== null && !saved && (
              <div className="save-name-bar">
                <label className="isi-label" htmlFor="analysis-name">Analysis name</label>
                <input
                  id="analysis-name"
                  className="name-input"
                  type="text"
                  value={analysisName}
                  onChange={e => setAnalysisName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveConfirm()}
                  autoFocus
                />
                <button
                  className="btn btn-primary"
                  onClick={handleSaveConfirm}
                  disabled={saving || !analysisName.trim()}
                >
                  {saving ? 'Saving…' : 'Confirm'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setAnalysisName(null)}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            )}

            {saveError && <div className="alert alert-error">{saveError}</div>}
          </section>
        )}

        <HistoryList refreshKey={historyKey} />
      </main>
    </div>
  )
}
