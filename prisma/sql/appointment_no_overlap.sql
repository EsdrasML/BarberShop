-- Impide que un mismo barbero tenga dos citas activas con intervalos que se cruzan.
-- Rango semiabierto [inicio, fin): una cita 10:00–10:50 permite otra a las 10:50.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_valid_range" CHECK ("endsAt" > "startsAt");

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_no_overlap"
  EXCLUDE USING gist (
    "barberId" WITH =,
    tstzrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE ("status" IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'));
