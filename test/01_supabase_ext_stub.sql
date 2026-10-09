-- Local stand-ins for Supabase pg_net / Vault / pg_cron (test only)
create schema if not exists net; create schema if not exists vault; create schema if not exists cron;
create table if not exists net._http_response(id bigint primary key, status_code int, content text, error_msg text, created timestamptz default now());
create table if not exists net._req(id bigserial primary key, url text, body jsonb, headers jsonb);
create or replace function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000) returns bigint
language plpgsql as $$ declare i bigint; begin insert into net._req(url,body,headers) values(url,body,headers) returning id into i;
  insert into net._http_response(id,status_code,content) values(i, case when body->'to'->>0 like 'fail%' then 422 else 200 end, '{"id":"x"}'); return i; end $$;
create table if not exists vault.secrets(name text primary key, secret text);
create or replace view vault.decrypted_secrets as select name, secret as decrypted_secret from vault.secrets;
create or replace function vault.create_secret(s text, n text) returns text language sql as $$ insert into vault.secrets values(n,s) on conflict(name) do update set secret=excluded.secret returning name $$;
create table if not exists cron.job(jobname text primary key, schedule text, command text);
create or replace function cron.schedule(n text, s text, c text) returns bigint language sql as $$ insert into cron.job values(n,s,c) on conflict(jobname) do update set schedule=excluded.schedule, command=excluded.command; select 1::bigint $$;
create or replace function cron.unschedule(n text) returns boolean language plpgsql as $$ begin delete from cron.job where jobname=n; if not found then raise exception 'not found'; end if; return true; end $$;
