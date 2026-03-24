export default function ResultsTable({ wells }) {
  return (
    <div className="table-wrapper">
      <table className="results-table">
        <thead>
          <tr>
            <th rowSpan={2} className="th-well">Well</th>
            <th colSpan={3} className="th-group th-group-total">All Spikes</th>
            <th colSpan={4} className="th-group th-group-burst">Bursts</th>
            <th colSpan={3} className="th-group th-group-single">Single Spikes</th>
          </tr>
          <tr>
            <th>Count</th>
            <th>Freq (Hz)</th>
            <th>Avg Amp (mV)</th>
            <th>Bursts</th>
            <th>Spikes</th>
            <th>Freq (Hz)</th>
            <th>Avg Amp (mV)</th>
            <th>Count</th>
            <th>Freq (Hz)</th>
            <th>Avg Amp (mV)</th>
          </tr>
        </thead>
        <tbody>
          {wells.map(w => (
            <tr key={w.wellId}>
              <td className="well-id">{w.wellId}</td>
              <td>{w.spikeCount.toLocaleString()}</td>
              <td>{w.frequencyHz.toFixed(4)}</td>
              <td>{w.avgAmplitudeMv.toFixed(4)}</td>
              <td className="burst-cell">{w.burstCount}</td>
              <td className="burst-cell">{w.burstSpikeCount.toLocaleString()}</td>
              <td className="burst-cell">{w.burstFrequencyHz.toFixed(4)}</td>
              <td className="burst-cell">{w.burstAvgAmplitudeMv > 0 ? w.burstAvgAmplitudeMv.toFixed(4) : '—'}</td>
              <td className="single-cell">{w.singleSpikeCount.toLocaleString()}</td>
              <td className="single-cell">{w.singleSpikeFrequencyHz.toFixed(4)}</td>
              <td className="single-cell">{w.singleSpikeAvgAmplitudeMv > 0 ? w.singleSpikeAvgAmplitudeMv.toFixed(4) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
