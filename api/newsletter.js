import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'crypto';

const sql = neon(process.env.DATABASE_URL);

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

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'email is required' });

    const inserted = await sql`
      INSERT INTO newsletter (id, email)
      VALUES (${randomUUID()}, ${email})
      ON CONFLICT (email) DO NOTHING
      RETURNING *
    `;

    return res.status(201).json(inserted?.[0] || { success: true });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
