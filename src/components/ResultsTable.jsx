export default function ResultsTable({ wells }) {
  return (
    <div className="table-wrapper">
      <table className="results-table">
        <thead>
          <tr>
            <th>Well ID</th>
            <th>Spike Count</th>
            <th>Frequency (Hz)</th>
            <th>Avg Amplitude (mV)</th>
          </tr>
        </thead>
        <tbody>
          {wells.map(w => (
            <tr key={w.wellId}>
              <td className="well-id">{w.wellId}</td>
              <td>{w.spikeCount.toLocaleString()}</td>
              <td>{w.frequencyHz.toFixed(4)}</td>
              <td>{w.avgAmplitudeMv.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
