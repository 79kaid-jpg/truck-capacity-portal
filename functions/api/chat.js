// Cloudflare Pages Function: POST /api/chat – chatbot của cổng Đặt Xe.
// Chỉ chuyển câu hỏi tới Workers AI (binding tên "AI"); mọi tra cứu / thao tác dữ liệu chạy ở trình duyệt
// bằng chính tài khoản người dùng, nên chatbot không có quyền nào riêng.
// Trước mỗi lượt gọi AI: kiểm tra token + quyền + hạn mức ngày bằng RPC public.chat_use (Supabase).
// v3.43: chat_use cho biết mô hình đang bật. 'claude' + có ANTHROPIC_API_KEY → gọi Anthropic (gọi công cụ chuẩn);
// còn lại hoặc Anthropic lỗi → Workers AI miễn phí. Trả về cùng một định dạng {text} cho trình duyệt.
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const CLAUDE = { haiku: 'claude-haiku-5-5', sonnet: 'claude-sonnet-5-5' };
// mô tả công cụ do trình duyệt gửi (tên + mô tả + args) → công cụ chuẩn của Anthropic
const toolDefs = defs => (Array.isArray(defs) ? defs : []).slice(0, 40).filter(d => d && /^[a-z_]{2,40}$/.test(d.name || ''))
  .map(d => ({ name: d.name, description: String(d.d || d.name).slice(0, 1000), input_schema: { type: 'object', additionalProperties: true } }));
// Anthropic: bỏ system ra ngoài, gộp các tin liền nhau cùng vai, bắt đầu bằng user
function toAnthropic(msgs) {
  const out = [];
  for (const m of msgs) { if (m.role === 'system') continue;
    if (out.length && out[out.length - 1].role === m.role) out[out.length - 1].content += '\n\n' + m.content; else out.push({ role: m.role, content: m.content }); }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}
async function callClaude(env, model, msgs, defs) {
  const system = msgs.filter(m => m.role === 'system').map(m => m.content).join('\n\n') +
    '\n\n[Cách làm việc] Dùng công cụ bằng cơ chế gọi công cụ (tool use), không viết JSON {"tool":…} thành chữ. Có thể gọi nhiều công cụ liên tiếp. Trả lời cuối bằng văn bản thường (markdown, tiếng Việt), không bọc trong {"answer":…}.';
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
    headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 1500, temperature: 0.2, system, messages: toAnthropic(msgs), tools: toolDefs(defs) }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || ('Anthropic ' + r.status));
  const use = (j.content || []).find(c => c.type === 'tool_use');
  if (use) return JSON.stringify({ tool: use.name, args: use.input || {} });
  const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
  // nếu Claude vẫn tự viết {"answer"/"tool"} thì để nguyên cho trình duyệt đọc; còn lại bọc thành {"answer"}
  try { const o = JSON.parse(text); if (o && (o.answer != null || o.tool)) return text; } catch {}
  return JSON.stringify({ answer: text });
}
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
    let note = '';
    if (qj.engine === 'claude') {
      if (!env.ANTHROPIC_API_KEY) note = 'Chưa cài ANTHROPIC_API_KEY – dùng mô hình miễn phí.';
      else try { const model = CLAUDE[qj.model] || CLAUDE.haiku;
        return json({ text: await callClaude(env, model, msgs, body.defs), left: qj.left, limit: qj.limit, engine: 'claude', model: qj.model || 'haiku' });
      } catch (e) { note = 'Claude lỗi (' + String(e && e.message || e).slice(0, 120) + ') – dùng mô hình miễn phí.'; }
    }
    if (!env.AI) return json({ error: 'Chatbot chưa được cài: thêm binding Workers AI tên "AI" trong Cloudflare Pages → Settings → Bindings.' }, 503);
    const out = await env.AI.run(env.CHAT_MODEL || MODEL, { messages: msgs, max_tokens: 900, temperature: 0.2 });
    // Workers AI có thể trả "response" là chuỗi hoặc đã tự parse thành object khi mô hình in ra JSON
    let text = typeof out === 'string' ? out : (out && (out.response ?? out.result?.response));
    if (text != null && typeof text !== 'string') text = JSON.stringify(text);
    return json({ text: text || '', left: qj.left, limit: qj.limit, engine: 'free', ...(note ? { note } : {}) });
  } catch (e) {
    return json({ error: 'Chatbot đang lỗi: ' + (e && e.message || e) }, 500);
  }
}
// GET: cho màn cấu hình biết đã cài khóa Anthropic chưa (không lộ khóa)
export const onRequestGet = ({ env }) => json({ ok: true, info: 'POST câu hỏi tới /api/chat', claudeKey: !!(env && env.ANTHROPIC_API_KEY) });
