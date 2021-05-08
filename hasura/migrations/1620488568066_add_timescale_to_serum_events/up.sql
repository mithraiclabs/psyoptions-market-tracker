ALTER TABLE serum_events DROP COLUMN pk_to_drop;

SELECT create_hypertable('serum_events', 'timestamp');
