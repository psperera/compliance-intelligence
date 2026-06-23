-- Enabled on first Postgres boot (mounted into docker-entrypoint-initdb.d).
-- Prisma migrations also declare these via the postgresqlExtensions preview feature.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
