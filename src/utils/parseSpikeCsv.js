/**
 * Parses an Axion Biosystems AxIS Spike List CSV export.
 *
 * Returns: { recordingName, durationS, totalSpikes, isiThreshold, wells }
 * where wells = [{
 *   wellId,
 *   spikeCount, frequencyHz, avgAmplitudeMv,
 *   burstCount, burstSpikeCount, burstFrequencyHz, burstAvgAmplitudeMv,
 *   singleSpikeCount, singleSpikeFrequencyHz, singleSpikeAvgAmplitudeMv,
 * }]
 */
export function parseSpikeCsv(text, isiThreshold = 0.1) {
  const lines = text.split(/\r?\n/)
  const metadata = {}
  const rawWells = new Map() // wellId → [{time, amplitude}]

  for (const line of lines) {
    const cols = line.split(',')
    if (cols.length < 5) continue

    if (cols[0]?.trim() === 'Well Information') break

    const timeStr = cols[2]?.trim()
    const electrode = cols[3]?.trim()
    const ampStr = cols[4]?.trim()

    if (/^\d+\.\d+$/.test(timeStr) && /^[A-Z]\d+_\d+$/.test(electrode)) {
      const wellId = electrode.substring(0, 2)
      if (!rawWells.has(wellId)) rawWells.set(wellId, [])
      rawWells.get(wellId).push({ time: parseFloat(timeStr), amplitude: parseFloat(ampStr) })
    } else {
      const key = cols[0]?.trim()
      const val = cols[1]?.trim()
      if (key && val) metadata[key] = val
    }
  }

  if (rawWells.size === 0) {
    throw new Error('No spike data found. Make sure this is an Axion Spike List CSV export.')
  }

  let durationS = 0
  for (const spikes of rawWells.values()) {
    for (const s of spikes) {
      if (s.time > durationS) durationS = s.time
    }
  }

  const recordingName = metadata['Recording Name'] || 'Unknown Recording'
  let totalSpikes = 0
  for (const spikes of rawWells.values()) totalSpikes += spikes.length

  const wells = []
  for (const [wellId, spikes] of rawWells) {
    wells.push(analyzeWell(wellId, spikes, durationS, isiThreshold))
  }
  wells.sort((a, b) => a.wellId.localeCompare(b.wellId))

  return { recordingName, durationS, totalSpikes, isiThreshold, wells }
}

function analyzeWell(wellId, spikes, durationS, isiThreshold) {
  spikes.sort((a, b) => a.time - b.time)

  // Mark each spike as burst (true) or single (false)
  const inBurst = new Array(spikes.length).fill(false)
  for (let i = 0; i < spikes.length - 1; i++) {
    if (spikes[i + 1].time - spikes[i].time < isiThreshold) {
      inBurst[i] = true
      inBurst[i + 1] = true
    }
  }

  // Count distinct burst events
  let burstCount = 0
  let inRun = false
  for (let i = 0; i < spikes.length; i++) {
    if (inBurst[i] && !inRun) { burstCount++; inRun = true }
    if (!inBurst[i]) inRun = false
  }

  const burstSpikes = spikes.filter((_, i) => inBurst[i])
  const singleSpikes = spikes.filter((_, i) => !inBurst[i])

  const mean = arr => arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0
  const freq = n => durationS > 0 ? n / durationS : 0

  return {
    wellId,
    spikeCount: spikes.length,
    frequencyHz: freq(spikes.length),
    avgAmplitudeMv: mean(spikes.map(s => s.amplitude)),
    burstCount,
    burstSpikeCount: burstSpikes.length,
    burstFrequencyHz: freq(burstSpikes.length),
    burstAvgAmplitudeMv: mean(burstSpikes.map(s => s.amplitude)),
    singleSpikeCount: singleSpikes.length,
    singleSpikeFrequencyHz: freq(singleSpikes.length),
    singleSpikeAvgAmplitudeMv: mean(singleSpikes.map(s => s.amplitude)),
  }
}
