import { sql } from '@vercel/postgres'

async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS recordings (
      id           SERIAL PRIMARY KEY,
      name         TEXT NOT NULL,
      source       TEXT NOT NULL,
      duration_s   FLOAT,
      total_spikes INTEGER,
      isi_threshold FLOAT DEFAULT 0.1,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE recordings ADD COLUMN IF NOT EXISTS isi_threshold FLOAT DEFAULT 0.1`

  await sql`
    CREATE TABLE IF NOT EXISTS well_results (
      id                       SERIAL PRIMARY KEY,
      recording_id             INTEGER REFERENCES recordings(id) ON DELETE CASCADE,
      well_id                  TEXT NOT NULL,
      spike_count              INTEGER,
      frequency_hz             FLOAT,
      avg_amplitude_mv         FLOAT,
      burst_count              INTEGER,
      burst_spike_count        INTEGER,
      burst_frequency_hz       FLOAT,
      burst_avg_amplitude_mv   FLOAT,
      single_spike_count       INTEGER,
      single_spike_frequency_hz      FLOAT,
      single_spike_avg_amplitude_mv  FLOAT
    )
  `
  await sql`ALTER TABLE well_results ADD COLUMN IF NOT EXISTS burst_count INTEGER`
  await sql`ALTER TABLE well_results ADD COLUMN IF NOT EXISTS burst_spike_count INTEGER`
  await sql`ALTER TABLE well_results ADD COLUMN IF NOT EXISTS burst_frequency_hz FLOAT`
  await sql`ALTER TABLE well_results ADD COLUMN IF NOT EXISTS burst_avg_amplitude_mv FLOAT`
  await sql`ALTER TABLE well_results ADD COLUMN IF NOT EXISTS single_spike_count INTEGER`
  await sql`ALTER TABLE well_results ADD COLUMN IF NOT EXISTS single_spike_frequency_hz FLOAT`
  await sql`ALTER TABLE well_results ADD COLUMN IF NOT EXISTS single_spike_avg_amplitude_mv FLOAT`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { recordingName, durationS, totalSpikes, isiThreshold, wells, source } = req.body

  if (!recordingName || !wells?.length) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    await ensureSchema()

    const { rows } = await sql`
      INSERT INTO recordings (name, source, duration_s, total_spikes, isi_threshold)
      VALUES (${recordingName}, ${source || 'local'}, ${durationS}, ${totalSpikes}, ${isiThreshold ?? 0.1})
      RETURNING id
    `
    const recordingId = rows[0].id

    for (const w of wells) {
      await sql`
        INSERT INTO well_results (
          recording_id, well_id,
          spike_count, frequency_hz, avg_amplitude_mv,
          burst_count, burst_spike_count, burst_frequency_hz, burst_avg_amplitude_mv,
          single_spike_count, single_spike_frequency_hz, single_spike_avg_amplitude_mv
        ) VALUES (
          ${recordingId}, ${w.wellId},
          ${w.spikeCount}, ${w.frequencyHz}, ${w.avgAmplitudeMv},
          ${w.burstCount}, ${w.burstSpikeCount}, ${w.burstFrequencyHz}, ${w.burstAvgAmplitudeMv || null},
          ${w.singleSpikeCount}, ${w.singleSpikeFrequencyHz}, ${w.singleSpikeAvgAmplitudeMv || null}
        )
      `
    }

    return res.status(200).json({ id: recordingId })
  } catch (e) {
    console.error('save-analysis error:', e)
    return res.status(500).json({ error: e.message })
  }
}
