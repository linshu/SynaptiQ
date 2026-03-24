import { useState, useEffect } from 'react'

export default function HistoryList({ refreshKey }) {
  const [recordings, setRecordings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState({})
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch('/api/get-analyses')
      .then(r => r.json())
      .then(data => {
        setRecordings(data.recordings || [])
        setError(null)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [refreshKey])

  const toggle = id => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <section className="history">
      <button className="history-toggle" onClick={() => setOpen(o => !o)}>
        <span>Analysis History</span>
        <span className="chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="history-body">
          {loading && <p className="history-msg">Loading...</p>}
          {error && <p className="history-msg error">Could not load history: {error}</p>}
          {!loading && !error && recordings.length === 0 && (
            <p className="history-msg">No saved analyses yet.</p>
          )}
          {recordings.map(rec => (
            <div key={rec.id} className="history-item">
              <button className="history-rec" onClick={() => toggle(rec.id)}>
                <span className="rec-name">{rec.name}</span>
                <span className="rec-meta">
                  {new Date(rec.created_at).toLocaleDateString()} &nbsp;·&nbsp;
                  {rec.total_spikes?.toLocaleString()} spikes &nbsp;·&nbsp;
                  {rec.duration_s?.toFixed(1)}s &nbsp;·&nbsp;
                  ISI {rec.isi_threshold ?? 0.1}s &nbsp;·&nbsp;
                  {rec.source}
                </span>
                <span className="chevron">{expanded[rec.id] ? '▲' : '▼'}</span>
              </button>
              {expanded[rec.id] && rec.wells && (
                <div className="table-wrapper history-table">
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th rowSpan={2} className="th-well">Well</th>
                        <th colSpan={3} className="th-group th-group-total">All Spikes</th>
                        <th colSpan={4} className="th-group th-group-burst">Bursts</th>
                        <th colSpan={3} className="th-group th-group-single">Single Spikes</th>
                      </tr>
                      <tr>
                        <th>Count</th><th>Freq (Hz)</th><th>Avg Amp (mV)</th>
                        <th>Bursts</th><th>Spikes</th><th>Freq (Hz)</th><th>Avg Amp (mV)</th>
                        <th>Count</th><th>Freq (Hz)</th><th>Avg Amp (mV)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rec.wells.map(w => (
                        <tr key={w.well_id}>
                          <td className="well-id">{w.well_id}</td>
                          <td>{w.spike_count?.toLocaleString()}</td>
                          <td>{w.frequency_hz?.toFixed(4)}</td>
                          <td>{w.avg_amplitude_mv?.toFixed(4)}</td>
                          <td className="burst-cell">{w.burst_count ?? '—'}</td>
                          <td className="burst-cell">{w.burst_spike_count?.toLocaleString() ?? '—'}</td>
                          <td className="burst-cell">{w.burst_frequency_hz?.toFixed(4) ?? '—'}</td>
                          <td className="burst-cell">{w.burst_avg_amplitude_mv?.toFixed(4) ?? '—'}</td>
                          <td className="single-cell">{w.single_spike_count?.toLocaleString() ?? '—'}</td>
                          <td className="single-cell">{w.single_spike_frequency_hz?.toFixed(4) ?? '—'}</td>
                          <td className="single-cell">{w.single_spike_avg_amplitude_mv?.toFixed(4) ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
