-- Local stub of Supabase pieces, ONLY for testing (never run on Supabase)
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth;
create table auth.users(id uuid primary key default gen_random_uuid(), email text unique, last_sign_in_at timestamptz, created_at timestamptz default now(),
  instance_id uuid, aud text, role text, encrypted_password text, email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb, updated_at timestamptz,
  confirmation_token text, recovery_token text, email_change_token_new text, email_change text, email_change_token_current text, phone_change text, phone_change_token text, reauthentication_token text);
create table auth.identities(id uuid primary key default gen_random_uuid(), provider_id text, user_id uuid references auth.users(id) on delete cascade, identity_data jsonb, provider text, last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true),''),'anon') $$;
create table auth.mfa_factors(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, factor_type text default 'totp', status text default 'verified', friendly_name text, created_at timestamptz default now());
create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_strip_nulls(jsonb_build_object('sub', nullif(current_setting('request.jwt.claim.sub', true),''), 'aal', nullif(current_setting('request.jwt.claim.aal', true),''))) $$;
grant usage on schema auth to anon, authenticated;
grant execute on all functions in schema auth to anon, authenticated;
