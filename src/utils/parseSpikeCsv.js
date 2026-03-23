/**
 * Parses an Axion Biosystems AxIS Spike List CSV export.
 *
 * Returns: { recordingName, durationS, totalSpikes, wells }
 * where wells = [{ wellId, spikeCount, frequencyHz, avgAmplitudeMv }]
 */
export function parseSpikeCsv(text) {
  const lines = text.split(/\r?\n/)
  const metadata = {}
  const spikes = []

  for (const line of lines) {
    const cols = line.split(',')
    if (cols.length < 5) continue

    // Stop at Well Information footer
    if (cols[0]?.trim() === 'Well Information') break

    const timeStr = cols[2]?.trim()
    const electrode = cols[3]?.trim()
    const ampStr = cols[4]?.trim()

    // Spike row: time in col[2], electrode label in col[3]
    if (/^\d+\.\d+$/.test(timeStr) && /^[A-Z]\d+_\d+$/.test(electrode)) {
      spikes.push({
        time: parseFloat(timeStr),
        amplitude: parseFloat(ampStr),
        wellId: electrode.substring(0, 2),
      })
    } else {
      // Metadata row
      const key = cols[0]?.trim()
      const val = cols[1]?.trim()
      if (key && val) metadata[key] = val
    }
  }

  if (spikes.length === 0) {
    throw new Error('No spike data found. Make sure this is an Axion Spike List CSV export.')
  }

  const durationS = spikes.reduce((max, s) => s.time > max ? s.time : max, 0)
  const recordingName = metadata['Recording Name'] || 'Unknown Recording'

  // Group spikes by well
  const wellMap = new Map()
  for (const spike of spikes) {
    if (!wellMap.has(spike.wellId)) wellMap.set(spike.wellId, [])
    wellMap.get(spike.wellId).push(spike)
  }

  const wells = []
  for (const [wellId, wellSpikes] of wellMap) {
    const spikeCount = wellSpikes.length
    const frequencyHz = durationS > 0 ? spikeCount / durationS : 0
    const avgAmplitudeMv =
      wellSpikes.reduce((sum, s) => sum + s.amplitude, 0) / spikeCount
    wells.push({ wellId, spikeCount, frequencyHz, avgAmplitudeMv })
  }

  wells.sort((a, b) => a.wellId.localeCompare(b.wellId))

  return { recordingName, durationS, totalSpikes: spikes.length, wells }
}
