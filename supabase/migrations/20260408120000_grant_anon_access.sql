-- 1. Explicitly grant anonymous SELECT on all existing tables in public schema
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 2. Ensure future tables also inherit these default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
