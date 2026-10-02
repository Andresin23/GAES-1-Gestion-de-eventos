/**
 * Verificacion del flujo de Supabase Auth sin depender de la BD.
 * Crea un usuario de prueba, hace login, valida el token y lo elimina.
 */
import { supabaseAdmin } from './src/config/supabase.js';

const EMAIL = `probe-${Date.now()}@test.local`;
const PASSWORD = 'Aa1!probe123456';

function decodeClaims(jwt: string): Record<string, unknown> {
  const [, payload] = jwt.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

async function main() {
  console.log('1) admin.createUser');
  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: false
  });
  if (createErr) throw new Error(`createUser: ${createErr.message}`);
  console.log('   OK authId=' + created.user.id);

  console.log('2) signInWithPassword con correo sin confirmar (debe fallar)');
  const { error: loginErr } = await supabaseAdmin.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD
  });
  console.log('   error esperado: ' + (loginErr?.message ?? '(NINGUNO - hay que revisar)'));

  console.log('3) admin.updateUserById -> email_confirm');
  const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(created.user.id, {
    email_confirm: true
  });
  if (updErr) throw new Error(`updateUserById: ${updErr.message}`);
  console.log('   OK');

  console.log('4) signInWithPassword (correo confirmado)');
  const { data: sesion, error: login2Err } = await supabaseAdmin.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD
  });
  if (login2Err) throw new Error(`signIn: ${login2Err.message}`);
  const token = sesion.session?.access_token;
  if (!token) throw new Error('sin access_token');
  console.log('   OK expira_en=' + sesion.session?.expires_in + 's');
  console.log('   refresh=' + (sesion.session?.refresh_token ? 'presente' : 'ausente'));

  console.log('5) claims del token');
  const claims = decodeClaims(token);
  console.log('   sub=' + claims.sub);
  console.log('   aal=' + claims.aal);
  console.log('   role=' + claims.role);
  console.log('   aud=' + JSON.stringify(claims.aud));
  console.log('   iss=' + claims.iss);

  console.log('6) admin.auth.getUser(token)');
  const { data: verificado, error: getErr } = await supabaseAdmin.auth.getUser(token);
  if (getErr) throw new Error(`getUser: ${getErr.message}`);
  console.log('   OK email=' + verificado.user.email);
  console.log('   factor_id=' + JSON.stringify(verificado.user.factor_id ?? null));

  console.log('7) refreshSession');
  const { data: refrescada, error: refreshErr } = await supabaseAdmin.auth.refreshSession({
    refresh_token: sesion.session!.refresh_token!
  });
  if (refreshErr) throw new Error(`refreshSession: ${refreshErr.message}`);
  console.log('   OK nuevo token=' + Boolean(refrescada.session?.access_token));

  console.log('8) buckets de storage');
  const { data: buckets, error: listErr } = await supabaseAdmin.storage.listBuckets();
  if (listErr) throw new Error(`listBuckets: ${listErr.message}`);
  console.log('   existentes: ' + (buckets.map((b) => b.name).join(', ') || '(ninguno)'));

  console.log('9) cleanup');
  const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(created.user.id);
  if (delErr) throw new Error(`deleteUser: ${delErr.message}`);
  console.log('   usuario de prueba eliminado');

  console.log('\nTODO OK');
}

main().catch((e) => {
  console.error('\nFALLO:', e.message);
  process.exit(1);
});