# Test-only stand-in for Supabase: serves web/ and executes RPCs against local Postgres as the given user.
import json, os, sys, http.server, psycopg2, psycopg2.extras
WEB = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../web'))
DSN = os.environ.get('DSN', 'host=/tmp user=postgres dbname=t')
conn = psycopg2.connect(DSN); conn.autocommit = True
def sig(fn):
    with conn.cursor() as c:
        c.execute("select proargnames, proargtypes::regtype[]::text[] from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname=%s", (fn,))
        r = c.fetchone(); return (r[0] or [], r[1] or []) if r else None
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=WEB, **k)
    def log_message(s, *a): pass
    def do_POST(s):
        body = json.loads(s.rfile.read(int(s.headers['Content-Length'])) or b'{}')
        out, code = None, 200
        try:
            if s.path == '/auth/login':
                with conn.cursor() as c:
                    c.execute("select id::text from auth.users where lower(email)=lower(%s)", (body['email'],)); r = c.fetchone()
                    if not r or body.get('password') != 'Test@1234': raise Exception('Invalid login credentials')
                    c.execute("update auth.users set last_sign_in_at=now() where id=%s", (r[0],))
                out = {'id': r[0], 'email': body['email']}
            else:
                fn = s.path.split('/')[-1]; names, types = sig(fn); args = body.get('args') or {}
                parts, vals = [], []
                for n, t in zip(names, types):
                    if n not in args: continue
                    v = args[n]
                    if v is None: parts.append(f"{n} => NULL::{t}"); continue
                    if t == 'jsonb': v = json.dumps(v)
                    elif t.endswith('[]'): v = '{' + ','.join('"%s"' % str(x).replace('"', '\\"') for x in v) + '}'
                    elif isinstance(v, bool): v = 'true' if v else 'false'
                    else: v = str(v)
                    parts.append(f"{n} => %s::{t}"); vals.append(v)
                with conn.cursor() as c:
                    c.execute("begin")
                    try:
                        c.execute("select set_config('request.jwt.claim.sub', %s, true)", (body.get('uid') or '',))
                        c.execute("set local role authenticated")
                        c.execute(f"select to_jsonb(public.{fn}({', '.join(parts)}))", vals)
                        out = c.fetchone()[0]; c.execute("commit")
                    except Exception: c.execute("rollback"); raise
        except Exception as e:
            code = 400; out = {'message': str(getattr(e, 'pgerror', None) or e).split('\n')[0].replace('ERROR:  ', '')}
        b = json.dumps(out).encode(); s.send_response(code); s.send_header('Content-Type', 'application/json'); s.end_headers(); s.wfile.write(b)
http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv) > 1 else 8787), H).serve_forever()
