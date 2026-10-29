-- Runs once, the first time the container starts with an empty volume.

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,           -- bcrypt hash, never the raw password
  role          TEXT        NOT NULL DEFAULT 'basic'
                CHECK (role IN ('basic', 'pro', 'elite')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Three demo members. All three passwords are: password123
-- Notice the hashes are all different — bcrypt salts every hash.
INSERT INTO users (name, email, password_hash, role) VALUES
  ('Aarav Shah',  'basic@pulse.fit', '$2b$10$gkYCGG/4ekvli2AvPUkrD.jOK30m2yB1nfqXAlFQ7ll06iI2vnvra', 'basic'),
  ('Priya Nair',  'pro@pulse.fit',   '$2b$10$6L0wKQRW4OYg.Y.Els7NMOG3TH8stXbUrrz7ms4HVVYiTVLYL68M2', 'pro'),
  ('Rohan Mehta', 'elite@pulse.fit', '$2b$10$7h4VNfzguWduGsAYFW.AQ.INgOM1oYr6u6NVleH1b.I.YJQBQJR5a', 'elite');
