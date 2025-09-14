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
    // Simple session-based cart using cookie or IP
    const sessionId = req.headers['x-session-id'] || req.connection.remoteAddress || 'anonymous';

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT 
          c.id AS cart_id,
          c.product_id,
          c.quantity,
          c.created_at,
          p.id AS product_id2,
          p.name,
          p.brand,
          p.price,
          p.image_url,
          p.capacity
        FROM cart_items c
        JOIN products p ON c.product_id = p.id
        WHERE c.session_id = ${sessionId}
        ORDER BY c.created_at DESC
      `;

      const cartItems = rows.map((r) => ({
        id: r.cart_id,
        productId: r.product_id,
        quantity: r.quantity,
        createdAt: r.created_at,
        product: {
          id: r.product_id2,
          name: r.name,
          brand: r.brand,
          price: r.price,
          imageUrl: r.image_url,
          capacity: r.capacity,
        },
      }));

      return res.status(200).json(cartItems);
    }

    if (req.method === 'POST') {
      const { productId, quantity = 1 } = req.body;
      
      // Check if item already exists in cart
      const [existingItem] = await sql`
        SELECT * FROM cart_items 
        WHERE session_id = ${sessionId} AND product_id = ${productId}
      `;

      if (existingItem) {
        // Update quantity
        await sql`
          UPDATE cart_items 
          SET quantity = quantity + ${quantity}
          WHERE session_id = ${sessionId} AND product_id = ${productId}
        `;
        const updatedJoined = await sql`
          SELECT 
            c.id AS cart_id,
            c.product_id,
            c.quantity,
            c.created_at,
            p.id AS product_id2,
            p.name,
            p.brand,
            p.price,
            p.image_url,
            p.capacity
          FROM cart_items c
          JOIN products p ON c.product_id = p.id
          WHERE c.session_id = ${sessionId} AND c.product_id = ${productId}
          LIMIT 1
        `;
        const r = updatedJoined[0];
        return res.status(200).json({
          id: r.cart_id,
          productId: r.product_id,
          quantity: r.quantity,
          createdAt: r.created_at,
          product: {
            id: r.product_id2,
            name: r.name,
            brand: r.brand,
            price: r.price,
            imageUrl: r.image_url,
            capacity: r.capacity,
          },
        });
      } else {
        // Add new item
        await sql`
          INSERT INTO cart_items (id, session_id, product_id, quantity)
          VALUES (${randomUUID()}, ${sessionId}, ${productId}, ${quantity})
        `;
        const joined = await sql`
          SELECT 
            c.id AS cart_id,
            c.product_id,
            c.quantity,
            c.created_at,
            p.id AS product_id2,
            p.name,
            p.brand,
            p.price,
            p.image_url,
            p.capacity
          FROM cart_items c
          JOIN products p ON c.product_id = p.id
          WHERE c.session_id = ${sessionId} AND c.product_id = ${productId}
          ORDER BY c.created_at DESC
          LIMIT 1
        `;
        const r = joined[0];
        return res.status(201).json({
          id: r.cart_id,
          productId: r.product_id,
          quantity: r.quantity,
          createdAt: r.created_at,
          product: {
            id: r.product_id2,
            name: r.name,
            brand: r.brand,
            price: r.price,
            imageUrl: r.image_url,
            capacity: r.capacity,
          },
        });
      }
    }

    if (req.method === 'DELETE') {
      const { productId } = req.query;
      
      await sql`
        DELETE FROM cart_items 
        WHERE session_id = ${sessionId} AND product_id = ${productId}
      `;
      
      return res.status(200).json({ success: true });
    }

    res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}