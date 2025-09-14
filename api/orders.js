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
      try {
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
      } catch (e) {
        // Fallback to shared schema: total, no items/customer_info columns
        const fallback = await sql`
          SELECT 
            id,
            order_code AS "orderCode",
            total AS "totalAmount",
            '[]'::json AS "orderItems",
            '{}'::json AS "customerInfo",
            status,
            created_at AS "createdAt"
          FROM orders 
          ORDER BY created_at DESC
        `;
        return res.status(200).json(fallback);
      }
    }

    if (req.method === 'POST') {
      const { orderCode, totalAmount, items, customerInfo } = req.body;
      
      try {
        const [order] = await sql`
          INSERT INTO orders (id, order_code, total_amount, items, customer_info, status)
          VALUES (${randomUUID()}, ${orderCode}, ${totalAmount}, ${JSON.stringify(items)}, ${JSON.stringify(customerInfo)}, 'pending')
          RETURNING id, order_code AS "orderCode", total_amount AS "totalAmount", items AS "orderItems", customer_info AS "customerInfo", status, created_at AS "createdAt"
        `;
        return res.status(201).json(order);
      } catch (e) {
        // Fallback to shared schema: columns total, shipping_address, billing_address
        const shippingAddress = JSON.stringify(customerInfo || {});
        const billingAddress = shippingAddress;
        const [order] = await sql`
          INSERT INTO orders (id, order_code, total, shipping_address, billing_address, status)
          VALUES (${randomUUID()}, ${orderCode}, ${totalAmount}, ${shippingAddress}, ${billingAddress}, 'pending')
          RETURNING id, order_code AS "orderCode", total AS "totalAmount", status, created_at AS "createdAt"
        `;
        return res.status(201).json({
          ...order,
          orderItems: [],
          customerInfo: customerInfo || {},
        });
      }
    }

    res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}