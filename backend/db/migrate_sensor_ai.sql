-- Apply to existing MySQL databases, including installations using ddl-auto=update:
-- Hibernate does not reliably expand an existing native MySQL ENUM. Safe to rerun.
SET @sensor_ai_ddl = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE()
   AND table_name='sensor_data_raw' AND column_name='heater_phase_valid') = 0,
  'ALTER TABLE sensor_data_raw ADD COLUMN heater_phase_valid BOOLEAN NULL', 'SELECT 1');
PREPARE sensor_ai_stmt FROM @sensor_ai_ddl;
EXECUTE sensor_ai_stmt;
DEALLOCATE PREPARE sensor_ai_stmt;

SET @sensor_ai_ddl = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE()
   AND table_name='sensor_data_raw' AND index_name='ix_raw_history_time') = 0,
  'CREATE INDEX ix_raw_history_time ON sensor_data_raw(device_set_history_id, measured_at)', 'SELECT 1');
PREPARE sensor_ai_stmt FROM @sensor_ai_ddl;
EXECUTE sensor_ai_stmt;
DEALLOCATE PREPARE sensor_ai_stmt;

ALTER TABLE alerts MODIFY COLUMN alert_type ENUM('SMOKING', 'FREEZE', 'WINDOW', 'AI_ANOMALY');

SET @sensor_ai_ddl = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE()
   AND table_name='alerts' AND column_name='ai_code') = 0,
  'ALTER TABLE alerts ADD COLUMN ai_code VARCHAR(64) NULL', 'SELECT 1');
PREPARE sensor_ai_stmt FROM @sensor_ai_ddl;
EXECUTE sensor_ai_stmt;
DEALLOCATE PREPARE sensor_ai_stmt;
