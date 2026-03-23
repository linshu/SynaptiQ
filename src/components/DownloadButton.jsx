export default function DownloadButton({ wells, recordingName }) {
  const handleDownload = () => {
    const rows = [['Well ID', 'Frequency (Hz)'], ...wells.map(w => [w.wellId, w.frequencyHz.toFixed(6)])]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${recordingName.replace(/[^a-z0-9]/gi, '_')}_frequencies.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button className="btn btn-secondary" onClick={handleDownload}>
      Download CSV
    </button>
  )
}
