import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Simple admin check
  const isAdmin = req.headers.authorization?.includes('admin') || (req.headers.cookie || '').includes('admin=1');
  if (!isAdmin) return res.status(401).json({ message: 'Admin access required' });

  try {
    if (req.method === 'GET') {
      const orders = await sql`
        SELECT 
          id,
          order_code AS "orderCode",
          total_amount AS "totalAmount",
          items AS "orderItems",
          customer_info AS "customerInfo",
          status,
          created_at AS "createdAt"
        FROM orders
        ORDER BY created_at DESC
      `;
      return res.status(200).json(orders);
    }

    res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Admin orders error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
