import { neon } from '@neondatabase/serverless';
import { scrypt as _scrypt } from 'crypto';

const sql = neon(process.env.DATABASE_URL);
const scrypt = (password, salt, keylen) => new Promise((resolve, reject) => {
  _scrypt(password, salt, keylen, (err, derivedKey) => {
    if (err) reject(err); else resolve(derivedKey);
  });
});

function setCookie(res, name, value, opts = {}) {
  const parts = [
    `${name}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Secure',
    `Max-Age=${7 * 24 * 60 * 60}`
  ];
  res.setHeader('Set-Cookie', parts.join('; '));
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    // Ensure password column exists
    const cols = await sql`SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password'`;
    if (!cols || cols.length === 0) {
      return res.status(400).json({ message: 'Password login not enabled' });
    }

    const users = await sql`SELECT id, email, password, first_name AS "firstName", last_name AS "lastName", role, created_at AS "createdAt" FROM users WHERE email = ${email} LIMIT 1`;
    if (!users || users.length === 0) return res.status(401).json({ message: 'Invalid email or password' });

    const user = users[0];
    const [hashed, salt] = (user.password || '').split('.');
    if (!hashed || !salt) return res.status(401).json({ message: 'Invalid email or password' });

    const derived = await scrypt(password, salt, 64);
    const ok = Buffer.from(hashed, 'hex').equals(derived);
    if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

    // Set cookie session id to user id (simple session)
    setCookie(res, 'sid', user.id);

    // Remove password from response
    delete user.password;
    return res.status(200).json(user);
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Login failed' });
  }
}
