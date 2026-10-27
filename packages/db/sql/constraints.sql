-- Vincoli che Drizzle non esprime nello schema. Idempotente: eseguito da `npm run db:migrate`
-- dopo le migrazioni generate.

CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  -- Una sala non può avere due prenotazioni attive sovrapposte
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_room_no_overlap') THEN
    ALTER TABLE session_room
      ADD CONSTRAINT session_room_no_overlap
      EXCLUDE USING gist (room_id WITH =, tstzrange(start_at, end_at) WITH &&) WHERE (active);
  END IF;

  -- Un fonico non può stare in due sessioni attive sovrapposte
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_staff_no_overlap') THEN
    ALTER TABLE session_staff
      ADD CONSTRAINT session_staff_no_overlap
      EXCLUDE USING gist (staff_id WITH =, tstzrange(start_at, end_at) WITH &&) WHERE (active);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_range_check') THEN
    ALTER TABLE session ADD CONSTRAINT session_range_check CHECK (end_at > start_at);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_room_range_check') THEN
    ALTER TABLE session_room ADD CONSTRAINT session_room_range_check CHECK (end_at > start_at);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_staff_range_check') THEN
    ALTER TABLE session_staff ADD CONSTRAINT session_staff_range_check CHECK (end_at > start_at);
  END IF;

  -- Acustica: coefficienti nell'intervallo fisico e bande ammesse
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_coefficient_alpha_check') THEN
    ALTER TABLE material_coefficient ADD CONSTRAINT material_coefficient_alpha_check CHECK (alpha >= 0 AND alpha <= 1.2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_coefficient_band_check') THEN
    ALTER TABLE material_coefficient ADD CONSTRAINT material_coefficient_band_check CHECK (band_hz IN (63, 125, 250, 500, 1000, 2000, 4000, 8000));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'surface_treatment_area_check') THEN
    ALTER TABLE surface_treatment ADD CONSTRAINT surface_treatment_area_check CHECK (area_m2 >= 0);
  END IF;

  -- Noleggi: il rientro non precede l'uscita
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rental_dates_check') THEN
    ALTER TABLE rental ADD CONSTRAINT rental_dates_check CHECK (expected_return_at >= out_at);
  END IF;
END $$;

-- Quando una sessione cambia orario o viene annullata, le prenotazioni di sale e fonici la seguono.
CREATE OR REPLACE FUNCTION sync_session_bookings() RETURNS trigger AS $$
BEGIN
  UPDATE session_room
     SET start_at = NEW.start_at, end_at = NEW.end_at, active = (NEW.status <> 'cancelled')
   WHERE session_id = NEW.id;
  UPDATE session_staff
     SET start_at = NEW.start_at, end_at = NEW.end_at, active = (NEW.status <> 'cancelled')
   WHERE session_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_session_sync_bookings ON session;
CREATE TRIGGER trg_session_sync_bookings
  AFTER UPDATE OF start_at, end_at, status ON session
  FOR EACH ROW EXECUTE FUNCTION sync_session_bookings();
