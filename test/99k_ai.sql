-- v3.43: bật / tắt Claude – thời hạn, hạn mức lượt Claude, quyền
\set AD '00000000-0000-0000-0000-00000000000a'
\set CS '00000000-0000-0000-0000-0000000000c1'
select set_config('request.jwt.claim.sub', :'AD', false);
select (public.chat_use()->>'engine') = 'free' as mac_dinh_free;
select (public.set_ai('claude','haiku',2)->>'engine') = 'claude' as bat_claude;
select (public.chat_use()->>'model') = 'haiku' as dung_haiku;
select (public.chat_stats()->>'claudeToday')::int = 1 as dem_claude;
\echo expect ERROR thời hạn
select public.set_ai('claude','haiku',20);
\echo expect ERROR loại Claude
select public.set_ai('claude','opus',2);
\echo --- hết thời hạn → tự về free
update app.settings set value = to_jsonb(now() - interval '1 minute') where key = 'aiUntil';
select (public.chat_use()->>'engine') = 'free' as het_han_ve_free;
\echo --- hết hạn mức (2 lượt, đã dùng 1 ở trên) → tự tắt + báo Admin
select (public.set_ai('claude','sonnet',2,2)->>'engine') = 'claude' as bat_lai;
select (public.chat_use()->>'engine') = 'claude' as luot_1_claude;
select (public.chat_use()->>'engine') = 'free' as luot_2_het_han_muc;
select value #>> '{}' = 'free' as da_tu_tat from app.settings where key = 'aiEngine';
select count(*) = 1 as bao_admin from app.notifications where text like '%lượt Claude hôm nay%';
select (public.set_ai(null,null,null,300)->>'engine') = 'free' as chi_doi_han_muc;
select value::int = 300 as han_muc_300 from app.settings where key = 'aiClaudeDaily';
select (public.set_ai('free')->>'engine') = 'free' as tat;
\echo expect ERROR không phải Admin
select set_config('request.jwt.claim.sub', :'CS', false);
select public.set_ai('claude','haiku',2);
