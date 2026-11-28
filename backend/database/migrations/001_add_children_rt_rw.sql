ALTER TABLE children
  ADD COLUMN IF NOT EXISTS rt VARCHAR(3),
  ADD COLUMN IF NOT EXISTS rw VARCHAR(3);

CREATE INDEX IF NOT EXISTS children_rt_idx ON children (rt) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS children_rw_idx ON children (rw) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS children_rt_rw_idx ON children (rt, rw) WHERE deleted_at IS NULL;
