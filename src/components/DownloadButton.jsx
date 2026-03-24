export default function DownloadButton({ wells, recordingName }) {
  const handleDownload = () => {
    const headers = [
      'Well ID',
      'Spike Count', 'Frequency (Hz)', 'Avg Amplitude (mV)',
      'Burst Count', 'Burst Spike Count', 'Burst Frequency (Hz)', 'Burst Avg Amplitude (mV)',
      'Single Spike Count', 'Single Spike Frequency (Hz)', 'Single Spike Avg Amplitude (mV)',
    ]
    const rows = wells.map(w => [
      w.wellId,
      w.spikeCount, w.frequencyHz.toFixed(6), w.avgAmplitudeMv.toFixed(6),
      w.burstCount, w.burstSpikeCount, w.burstFrequencyHz.toFixed(6),
      w.burstAvgAmplitudeMv > 0 ? w.burstAvgAmplitudeMv.toFixed(6) : '',
      w.singleSpikeCount, w.singleSpikeFrequencyHz.toFixed(6),
      w.singleSpikeAvgAmplitudeMv > 0 ? w.singleSpikeAvgAmplitudeMv.toFixed(6) : '',
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${recordingName.replace(/[^a-z0-9]/gi, '_')}_analysis.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button className="btn btn-secondary" onClick={handleDownload}>
      Download CSV
    </button>
  )
}
