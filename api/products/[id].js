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
      const products = await sql`
        SELECT 
          id,
          name,
          description,
          description_en AS "descriptionEnglish",
          description_ka AS "descriptionGeorgian",
          price,
          brand,
          category,
          categories,
          image_url AS "imageUrl",
          capacity,
          0::int AS "discountPercentage",
          true AS "inStock",
          created_at AS "createdAt"
        FROM products 
        WHERE id = ${id}
        LIMIT 1
      `;
      if (!products || products.length === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }
      const p = products[0];
      return res.status(200).json({
        ...p,
        categories: typeof p.categories === 'string' ? JSON.parse(p.categories || '[]') : (p.categories || []),
      });
    }

    res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
