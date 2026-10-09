// Cấu hình kết nối Supabase. Hai giá trị này là CÔNG KHAI (trình duyệt nào cũng thấy), không phải mật khẩu.
// Lấy tại Supabase → Project Settings → API:
//   SUPABASE_URL      = "Project URL"
//   SUPABASE_ANON_KEY = khóa "anon public" (hoặc "Publishable key")
// TUYỆT ĐỐI KHÔNG dán "service_role" / "secret key" vào đây.
window.APP_CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT-REF.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-PUBLIC-KEY'
};
