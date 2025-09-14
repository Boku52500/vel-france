import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/(?:^|;\s*)sid=([^;]+)/);
    const sid = match ? decodeURIComponent(match[1]) : '';
    if (!sid) return res.status(401).json({ message: 'Not authenticated' });

    const rows = await sql`
      SELECT id, email, first_name AS "firstName", last_name AS "lastName", profile_image_url AS "profileImageUrl", is_admin AS "isAdmin", created_at AS "createdAt" 
      FROM users WHERE id = ${sid} LIMIT 1`;
    if (!rows || rows.length === 0) return res.status(401).json({ message: 'Not authenticated' });

    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ message: 'Failed to get user' });
  }
}