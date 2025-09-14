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
    const { firstName = '', lastName = '', email = '', subject = '', message = '' } = req.body || {};
    const name = `${firstName} ${lastName}`.trim() || 'Anonymous';
    const fullMessage = subject ? `${subject}\n\n${message}` : message;

    const [record] = await sql`
      INSERT INTO contact_messages (id, name, email, message)
      VALUES (${randomUUID()}, ${name}, ${email}, ${fullMessage})
      RETURNING *
    `;

    return res.status(201).json(record);
  } catch (error) {
    console.error('Contact submit error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
