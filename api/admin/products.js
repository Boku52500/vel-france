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
    // Simple admin check - in production use proper JWT validation
    const isAdmin = req.headers.authorization?.includes('admin') || 
                   req.body?.username?.toLowerCase() === 'giorgi';

    if (!isAdmin) {
      return res.status(401).json({ message: 'Admin access required' });
    }

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT 
          id,
          name,
          description,
          price,
          brand,
          category,
          image_url,
          capacity,
          created_at
        FROM products 
        ORDER BY created_at DESC
      `;
      const products = rows.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        descriptionEnglish: null,
        descriptionGeorgian: null,
        price: r.price,
        brand: r.brand,
        category: r.category,
        categories: [],
        imageUrl: r.image_url ? (r.image_url.startsWith('http') ? r.image_url : (r.image_url.startsWith('/') ? r.image_url : `/${r.image_url}`)) : null,
        capacity: r.capacity,
        discountPercentage: 0,
        inStock: true,
        createdAt: r.created_at,
      }));
      return res.status(200).json(products);
    }

    if (req.method === 'POST') {
      const { name, description, price, brand, category, imageUrl, capacity } = req.body;
      
      const [inserted] = await sql`
        INSERT INTO products (id, name, description, price, brand, category, image_url, capacity)
        VALUES (${randomUUID()}, ${name}, ${description}, ${price}, ${brand}, ${category}, ${imageUrl}, ${capacity})
        RETURNING id, name, description, price, brand, category, image_url, capacity, created_at
      `;
      
      return res.status(201).json({
        id: inserted.id,
        name: inserted.name,
        description: inserted.description,
        descriptionEnglish: null,
        descriptionGeorgian: null,
        price: inserted.price,
        brand: inserted.brand,
        category: inserted.category,
        categories: [],
        imageUrl: inserted.image_url ? (inserted.image_url.startsWith('http') ? inserted.image_url : (inserted.image_url.startsWith('/') ? inserted.image_url : `/${inserted.image_url}`)) : null,
        capacity: inserted.capacity,
        discountPercentage: 0,
        inStock: true,
        createdAt: inserted.created_at,
      });
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      const { name, description, price, brand, category, imageUrl, capacity } = req.body;
      
      const [updated] = await sql`
        UPDATE products 
        SET name = ${name}, description = ${description}, price = ${price}, 
            brand = ${brand}, category = ${category}, image_url = ${imageUrl}, 
            capacity = ${capacity}
        WHERE id = ${id}
        RETURNING id, name, description, price, brand, category, image_url, capacity, created_at
      `;
      
      return res.status(200).json({
        id: updated.id,
        name: updated.name,
        description: updated.description,
        descriptionEnglish: null,
        descriptionGeorgian: null,
        price: updated.price,
        brand: updated.brand,
        category: updated.category,
        categories: [],
        imageUrl: updated.image_url ? (updated.image_url.startsWith('http') ? updated.image_url : (updated.image_url.startsWith('/') ? updated.image_url : `/${updated.image_url}`)) : null,
        capacity: updated.capacity,
        discountPercentage: 0,
        inStock: true,
        createdAt: updated.created_at,
      });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      // Delete related cart items first
      await sql`DELETE FROM cart_items WHERE product_id = ${id}`;
      
      // Delete the product
      await sql`DELETE FROM products WHERE id = ${id}`;
      
      return res.status(200).json({ success: true });
    }

    res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}