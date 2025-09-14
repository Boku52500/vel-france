import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'crypto';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const translations = await sql`
        SELECT 
          id,
          key,
          english AS "englishText",
          georgian AS "georgianText",
          created_at AS "createdAt"
        FROM translations 
        ORDER BY key ASC
      `;
      
      return res.status(200).json(translations);
    }

    if (req.method === 'POST') {
      const { key, english, georgian } = req.body;
      
      const [translation] = await sql`
        INSERT INTO translations (id, key, english, georgian)
        VALUES (${randomUUID()}, ${key}, ${english}, ${georgian})
        ON CONFLICT (key) DO UPDATE SET
          english = EXCLUDED.english,
          georgian = EXCLUDED.georgian
        RETURNING *
      `;
      
      return res.status(200).json(translation);
    }

    res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}