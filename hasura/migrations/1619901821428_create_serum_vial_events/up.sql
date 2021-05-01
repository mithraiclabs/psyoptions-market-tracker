CREATE TABLE serum_vial_events (
 timestamp  TIMESTAMPTZ     NOT NULL,
 data       JSONB           NOT NULL
);

CREATE INDEX idx_data ON serum_vial_events(data);

SELECT create_hypertable('serum_vial_events', 'timestamp');
