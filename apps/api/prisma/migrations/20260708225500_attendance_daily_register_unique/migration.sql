-- Postgres unique indexes treat NULL as distinct from NULL, so the
-- composite unique on (studentId, date, type, subjectId) does not, by
-- itself, stop two DAILY_REGISTER rows (subjectId always NULL) being
-- inserted for the same student on the same day. Enforce "one Form
-- Teacher mark per student per day" with a partial unique index instead.
CREATE UNIQUE INDEX "AttendanceRecord_daily_register_unique"
  ON "AttendanceRecord" ("studentId", "date")
  WHERE "type" = 'DAILY_REGISTER';
