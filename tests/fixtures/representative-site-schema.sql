CREATE TABLE content_sections ("key" text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE waitlist (id serial PRIMARY KEY, email text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT waitlist_email_unique UNIQUE (email));
CREATE TABLE contact_messages (id serial PRIMARY KEY, name text NOT NULL, email text NOT NULL, message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
INSERT INTO content_sections ("key", value, updated_at) VALUES ('hero', '{"title":"AgentKip"}', '2026-01-02T03:04:05.678Z');
INSERT INTO waitlist (id, email, created_at) VALUES (41, 'fixture@example.invalid', '2026-01-03T04:05:06.789Z');
SELECT setval('waitlist_id_seq', 41, true);
INSERT INTO contact_messages (id, name, email, message, created_at) VALUES (73, 'Fixture', 'fixture@example.invalid', 'preserve me', '2026-01-04T05:06:07.890Z');
SELECT setval('contact_messages_id_seq', 73, true);
