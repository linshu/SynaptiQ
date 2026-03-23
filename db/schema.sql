CREATE TABLE IF NOT EXISTS recordings (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  source       TEXT NOT NULL,
  duration_s   FLOAT,
  total_spikes INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS well_results (
  id               SERIAL PRIMARY KEY,
  recording_id     INTEGER REFERENCES recordings(id) ON DELETE CASCADE,
  well_id          TEXT NOT NULL,
  spike_count      INTEGER,
  frequency_hz     FLOAT,
  avg_amplitude_mv FLOAT
);
