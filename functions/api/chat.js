// Cloudflare Pages Function: POST /api/chat – chatbot của cổng Đặt Xe.
// Chỉ chuyển câu hỏi tới Workers AI (binding tên "AI"); mọi tra cứu / thao tác dữ liệu chạy ở trình duyệt
// bằng chính tài khoản người dùng, nên chatbot không có quyền nào riêng.
// Trước mỗi lượt gọi AI: kiểm tra token + quyền + hạn mức ngày bằng RPC public.chat_use (Supabase).
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
let CFG = null;
async function loadCfg(env, request) {
  if (CFG) return CFG;
  if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) return (CFG = { url: env.SUPABASE_URL, key: env.SUPABASE_ANON_KEY });
  const r = await env.ASSETS.fetch(new URL('/config.js', request.url));
  const t = await r.text();
  const url = (t.match(/SUPABASE_URL\s*:\s*['"]([^'"]+)['"]/) || [])[1], key = (t.match(/SUPABASE_ANON_KEY\s*:\s*['"]([^'"]+)['"]/) || [])[1];
  if (!url || !key) throw new Error('Không đọc được web/config.js');
  return (CFG = { url: url.trim().replace(/\/(rest|auth)\/v1\/?$/, '').replace(/\/+$/, ''), key: key.trim() });
}
export async function onRequestPost({ request, env }) {
  try {
    if (!env.AI) return json({ error: 'Chatbot chưa được cài: thêm binding Workers AI tên "AI" trong Cloudflare Pages → Settings → Bindings.' }, 503);
    const auth = request.headers.get('authorization') || '';
    if (!/^Bearer\s+\S+/.test(auth)) return json({ error: 'Chưa đăng nhập.' }, 401);
    let body; try { body = await request.json(); } catch { return json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, 400); }
    const cfg = await loadCfg(env, request);
    const q = await fetch(cfg.url + '/rest/v1/rpc/chat_use', { method: 'POST', headers: { apikey: cfg.key, authorization: auth, 'content-type': 'application/json' },
      body: JSON.stringify({ p_tools: (Array.isArray(body.tools) ? body.tools : []).slice(0, 8).map(x => String(x).slice(0, 40)) }) });
    const qj = await q.json().catch(() => ({}));
    if (!q.ok) return json({ error: qj.message || 'Không có quyền dùng chatbot.' }, 403);
    // giới hạn kích thước: tối đa 24 tin, mỗi tin 6000 ký tự
    const msgs = (Array.isArray(body.messages) ? body.messages : []).slice(-24)
      .filter(m => m && ['system', 'user', 'assistant'].includes(m.role) && typeof m.content === 'string')
      .map(m => ({ role: m.role, content: m.content.slice(0, m.role === 'system' ? 12000 : 6000) }));
    if (!msgs.some(m => m.role === 'user')) return json({ error: 'Thiếu câu hỏi.' }, 400);
    const out = await env.AI.run(env.CHAT_MODEL || MODEL, { messages: msgs, max_tokens: 900, temperature: 0.2 });
    // Workers AI có thể trả "response" là chuỗi hoặc đã tự parse thành object khi mô hình in ra JSON
    let text = typeof out === 'string' ? out : (out && (out.response ?? out.result?.response));
    if (text != null && typeof text !== 'string') text = JSON.stringify(text);
    return json({ text: text || '', left: qj.left, limit: qj.limit });
  } catch (e) {
    return json({ error: 'Chatbot đang lỗi: ' + (e && e.message || e) }, 500);
  }
}
export const onRequestGet = () => json({ ok: true, info: 'POST câu hỏi tới /api/chat' });
