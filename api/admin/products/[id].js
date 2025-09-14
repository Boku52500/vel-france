import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const isAdmin = req.headers.authorization?.includes('admin') || (req.headers.cookie || '').includes('admin=1');
  if (!isAdmin) return res.status(401).json({ message: 'Admin access required' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ message: 'id is required' });

  try {
    if (req.method === 'PUT') {
      const { name, description, price, brand, category, imageUrl, capacity, categories, descriptionEn, descriptionKa } = req.body;
      const updated = await sql`
        UPDATE products 
        SET name = ${name}, description = ${description}, price = ${price}, 
            brand = ${brand}, category = ${category}, image_url = ${imageUrl}, 
            capacity = ${capacity}, categories = ${JSON.stringify(categories)},
            description_en = ${descriptionEn}, description_ka = ${descriptionKa}
        WHERE id = ${id}
        RETURNING *
      `;
      if (!updated || updated.length === 0) return res.status(404).json({ message: 'Product not found' });
      return res.status(200).json(updated[0]);
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM cart_items WHERE product_id = ${id}`;
      await sql`DELETE FROM products WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Admin product update/delete error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
