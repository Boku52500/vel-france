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
        ORDER BY created_at DESC
      `;
      const products = rows.map(p => ({
        ...p,
        categories: typeof p.categories === 'string' ? JSON.parse(p.categories || '[]') : (p.categories || []),
        imageUrl: p.imageUrl ? (p.imageUrl.startsWith('http') ? p.imageUrl : (p.imageUrl.startsWith('/') ? p.imageUrl : `/${p.imageUrl}`)) : null,
      }));
      return res.status(200).json(products);
    }

    if (req.method === 'POST') {
      const { name, description, price, brand, category, imageUrl, capacity, categories, descriptionEn, descriptionKa } = req.body;
      
      const [product] = await sql`
        INSERT INTO products (id, name, description, price, brand, category, image_url, capacity, categories, description_en, description_ka)
        VALUES (${randomUUID()}, ${name}, ${description}, ${price}, ${brand}, ${category}, ${imageUrl}, ${capacity}, ${JSON.stringify(categories || [])}, ${descriptionEn}, ${descriptionKa})
        RETURNING id, name, description, description_en AS "descriptionEnglish", description_ka AS "descriptionGeorgian", price, brand, category, categories, image_url AS "imageUrl", capacity, 0::int AS "discountPercentage", true AS "inStock", created_at AS "createdAt"
      `;
      
      return res.status(201).json({
        ...product,
        categories: typeof product.categories === 'string' ? JSON.parse(product.categories || '[]') : (product.categories || []),
        imageUrl: product.imageUrl ? (product.imageUrl.startsWith('http') ? product.imageUrl : (product.imageUrl.startsWith('/') ? product.imageUrl : `/${product.imageUrl}`)) : null,
      });
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      const { name, description, price, brand, category, imageUrl, capacity, categories, descriptionEn, descriptionKa } = req.body;
      
      const [product] = await sql`
        UPDATE products 
        SET name = ${name}, description = ${description}, price = ${price}, 
            brand = ${brand}, category = ${category}, image_url = ${imageUrl}, 
            capacity = ${capacity}, categories = ${JSON.stringify(categories || [])},
            description_en = ${descriptionEn}, description_ka = ${descriptionKa}
        WHERE id = ${id}
        RETURNING id, name, description, description_en AS "descriptionEnglish", description_ka AS "descriptionGeorgian", price, brand, category, categories, image_url AS "imageUrl", capacity, 0::int AS "discountPercentage", true AS "inStock", created_at AS "createdAt"
      `;
      
      return res.status(200).json({
        ...product,
        categories: typeof product.categories === 'string' ? JSON.parse(product.categories || '[]') : (product.categories || []),
        imageUrl: product.imageUrl ? (product.imageUrl.startsWith('http') ? product.imageUrl : (product.imageUrl.startsWith('/') ? product.imageUrl : `/${product.imageUrl}`)) : null,
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