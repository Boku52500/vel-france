import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const isAdmin = req.headers.authorization?.includes('admin') || (req.headers.cookie || '').includes('admin=1');
  if (!isAdmin) return res.status(401).json({ message: 'Admin access required' });

  const { orderId } = req.query;
  if (!orderId) return res.status(400).json({ message: 'orderId is required' });

  try {
    if (req.method === 'PATCH') {
      const { status } = req.body || {};
      if (!status) return res.status(400).json({ message: 'status is required' });
      const updated = await sql`
        UPDATE orders SET status = ${status}
        WHERE id = ${orderId}
        RETURNING id, order_code AS "orderCode", total_amount AS "totalAmount", items AS "orderItems", customer_info AS "customerInfo", status, created_at AS "createdAt"
      `;
      if (!updated || updated.length === 0) return res.status(404).json({ message: 'Order not found' });
      return res.status(200).json(updated[0]);
    }
    res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Admin update order status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
