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

  let { id } = req.query;
  if (Array.isArray(id)) id = id[0];
  if (!id) {
    res.status(400).json({ message: 'Product id is required' });
    return;
  }

  try {
    if (req.method === 'GET') {
      console.log('API products/[id] request id=', id);
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
        WHERE LOWER(TRIM(id)) = LOWER(TRIM(${id}))
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
          ? (() => {
              // Remove localhost host if present
              const withoutHost = r.image_url.replace(/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\\d+)?/i, '');
              const p = withoutHost.startsWith('/') ? withoutHost : `/${withoutHost}`;
              const p2 = p.replace(/\\/g, '/');
              // Map attached_assets to assets for Vercel static hosting
              return p2.replace('/attached_assets/', '/assets/').replace(/^\/attached_assets\//, '/assets/');
            })()
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
