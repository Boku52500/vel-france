import { neon } from '@neondatabase/serverless';
import { randomUUID, scrypt as _scrypt } from 'crypto';

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
    const { email, password, firstName = '', lastName = '' } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    // Ensure password column exists
    const cols = await sql`SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password'`;
    if (!cols || cols.length === 0) {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password text`;
    }

    // Check existing user
    const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    if (existing && existing.length > 0) return res.status(400).json({ message: 'User already exists' });

    // Hash password
    const salt = randomUUID().replace(/-/g, '').slice(0, 32);
    const buf = await scrypt(password, salt, 64);
    const hashed = `${buf.toString('hex')}.${salt}`;

    const [user] = await sql`
      INSERT INTO users (id, email, password, first_name, last_name, role)
      VALUES (${randomUUID()}, ${email}, ${hashed}, ${firstName}, ${lastName}, 'user')
      RETURNING id, email, first_name AS "firstName", last_name AS "lastName", role, created_at AS "createdAt"
    `;

    // Set session cookie with user id (simple)
    setCookie(res, 'sid', user.id);
    return res.status(201).json(user);
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Registration failed' });
  }
}
