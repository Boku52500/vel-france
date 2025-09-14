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

  const { id } = req.query;
  if (!id) {
    res.status(400).json({ message: 'Product id is required' });
    return;
  }

  try {
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
        WHERE id = ${id}
        LIMIT 1
      `;
      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }
      const r = rows[0];
      const product = {
        id: r.id,
        name: r.name,
        description: r.description,
        descriptionEnglish: null,
        descriptionGeorgian: null,
        price: r.price,
        brand: r.brand,
        category: r.category,
        categories: [],
        imageUrl: r.image_url
          ? (r.image_url.startsWith('http') ? r.image_url : (r.image_url.startsWith('/') ? r.image_url : `/${r.image_url}`))
          : null,
        capacity: r.capacity,
        discountPercentage: 0,
        inStock: true,
        createdAt: r.created_at,
      };
      return res.status(200).json(product);
    }

    res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
