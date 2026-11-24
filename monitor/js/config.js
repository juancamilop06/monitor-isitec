/* ===========================================================
   config.js · Conexión con la base de datos (Supabase)
   -----------------------------------------------------------
   La "anon key" es pública por diseño: la seguridad la dan las
   políticas RLS de supabase/schema.sql (solo usuarios con sesión).
   Si se dejan vacías, la app funciona en modo local (localStorage).
   =========================================================== */
const CONFIG = {
  SUPABASE_URL: 'https://ulopavqlndjafmgjaiqg.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_NX6hp-dZYBOaAG7tjkPN8w_Xkn92saA'
};
