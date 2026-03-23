import { sql } from '@vercel/postgres'

async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS recordings (
      id           SERIAL PRIMARY KEY,
      name         TEXT NOT NULL,
      source       TEXT NOT NULL,
      duration_s   FLOAT,
      total_spikes INTEGER,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS well_results (
      id               SERIAL PRIMARY KEY,
      recording_id     INTEGER REFERENCES recordings(id) ON DELETE CASCADE,
      well_id          TEXT NOT NULL,
      spike_count      INTEGER,
      frequency_hz     FLOAT,
      avg_amplitude_mv FLOAT
    )
  `
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await ensureSchema()
    const { rows: recordings } = await sql`
      SELECT id, name, source, duration_s, total_spikes, created_at
      FROM recordings
      ORDER BY created_at DESC
      LIMIT 50
    `

    if (recordings.length === 0) {
      return res.status(200).json({ recordings: [] })
    }

    const ids = recordings.map(r => r.id)
    const { rows: wells } = await sql`
      SELECT recording_id, well_id, spike_count, frequency_hz, avg_amplitude_mv
      FROM well_results
      WHERE recording_id = ANY(${ids})
      ORDER BY well_id
    `

    const wellsByRecording = {}
    for (const w of wells) {
      if (!wellsByRecording[w.recording_id]) wellsByRecording[w.recording_id] = []
      wellsByRecording[w.recording_id].push(w)
    }

    const result = recordings.map(r => ({
      ...r,
      wells: wellsByRecording[r.id] || [],
    }))

    return res.status(200).json({ recordings: result })
  } catch (e) {
    console.error('get-analyses error:', e)
    return res.status(500).json({ error: e.message })
  }
}
