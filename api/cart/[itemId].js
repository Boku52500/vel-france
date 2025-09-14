import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { itemId } = req.query;
  if (!itemId) {
    res.status(400).json({ message: 'itemId is required' });
    return;
  }

  try {
    if (req.method === 'PUT') {
      const { quantity } = req.body || {};
      if (typeof quantity !== 'number' || quantity < 1) {
        return res.status(400).json({ message: 'quantity must be a positive number' });
        }
      const updated = await sql`UPDATE cart_items SET quantity = ${quantity} WHERE id = ${itemId} RETURNING *`;
      if (!updated || updated.length === 0) {
        return res.status(404).json({ message: 'Cart item not found' });
      }
      return res.status(200).json(updated[0]);
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM cart_items WHERE id = ${itemId}`;
      return res.status(200).json({ success: true });
    }

    res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
