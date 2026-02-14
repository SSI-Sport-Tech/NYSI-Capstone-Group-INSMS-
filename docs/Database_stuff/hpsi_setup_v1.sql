

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Ensure pgcrypto is in public (so we can find gen_random_bytes)
ALTER EXTENSION "pgcrypto" SET SCHEMA public;


CREATE OR REPLACE FUNCTION public.uuid_generate_v7()
RETURNS uuid
AS $$
DECLARE
  unix_ts_ms bytea;
  uuid_bytes bytea;
BEGIN
  -- Get current timestamp in milliseconds
  unix_ts_ms := substring(
    int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) 
    from 3
  );

  -- FIXED: Now it explicitly looks in the 'public' schema
  uuid_bytes := unix_ts_ms || public.gen_random_bytes(10);

  -- Set version bit to 7
  uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);

  -- Set variant bit to 2
  uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);

  RETURN encode(uuid_bytes, 'hex')::uuid;
END
$$
LANGUAGE plpgsql
VOLATILE;

