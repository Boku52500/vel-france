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

  let { id } = req.query;
  if (Array.isArray(id)) id = id[0];
  if (!id) return res.status(400).json({ message: 'id is required' });

  try {
    if (req.method === 'PUT') {
      const { name, description, price, brand, category, imageUrl, capacity } = req.body;
      const updated = await sql`
        UPDATE products 
        SET name = ${name}, description = ${description}, price = ${price}, 
            brand = ${brand}, category = ${category}, image_url = ${imageUrl}, 
            capacity = ${capacity}
        WHERE LOWER(TRIM(id)) = LOWER(TRIM(${id}))
        RETURNING id, name, description, price, brand, category, image_url, capacity, created_at
      `;
      if (!updated || updated.length === 0) return res.status(404).json({ message: 'Product not found' });
      const r = updated[0];
      return res.status(200).json({
        id: r.id,
        name: r.name,
        description: r.description,
        descriptionEnglish: null,
        descriptionGeorgian: null,
        price: r.price,
        brand: r.brand,
        category: r.category,
        categories: [],
        imageUrl: r.image_url,
        capacity: r.capacity,
        discountPercentage: 0,
        inStock: true,
        createdAt: r.created_at,
      });
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM cart_items WHERE LOWER(TRIM(product_id)) = LOWER(TRIM(${id}))`;
      await sql`DELETE FROM products WHERE LOWER(TRIM(id)) = LOWER(TRIM(${id}))`;
      return res.status(200).json({ success: true });
    }

    res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Admin product update/delete error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
