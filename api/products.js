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
        ORDER BY name ASC
      `;

      const normalized = rows.map(r => ({
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
              let p = r.image_url.replace(/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\\d+)?/i, '');
              // Replace backslashes with slashes
              p = p.replace(/\\/g, '/');
              // Strip leading public/
              p = p.replace(/^\/?public\//i, '/');
              // Ensure leading slash
              if (!p.startsWith('/')) p = `/${p}`;
              // Map attached_assets to assets
              p = p.replace('/attached_assets/', '/assets/').replace(/^\/attached_assets\//, '/assets/');
              // If it's a bare filename at root, assume assets
              const parts = p.split('/').filter(Boolean);
              if (parts.length === 1) {
                p = `/assets/${parts[0]}`;
              }
              return p;
            })()
          : null,
        capacity: r.capacity,
        discountPercentage: 0,
        inStock: true,
        createdAt: r.created_at,
      }));

      return res.status(200).json(normalized);
    }

    if (req.method === 'POST') {
      const { name, description, price, brand, category, imageUrl, capacity, categories, descriptionEn, descriptionKa } = req.body;
      
      const [inserted] = await sql`
        INSERT INTO products (id, name, description, price, brand, category, image_url, capacity)
        VALUES (${randomUUID()}, ${name}, ${description}, ${price}, ${brand}, ${category}, ${imageUrl}, ${capacity})
        RETURNING id, name, description, price, brand, category, image_url, capacity, created_at
      `;

      const product = {
        id: inserted.id,
        name: inserted.name,
        description: inserted.description,
        descriptionEnglish: null,
        descriptionGeorgian: null,
        price: inserted.price,
        brand: inserted.brand,
        category: inserted.category,
        categories: [],
        imageUrl: inserted.image_url
          ? (() => {
              let p = inserted.image_url.replace(/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\\d+)?/i, '');
              p = p.replace(/\\/g, '/');
              p = p.replace(/^\/?public\//i, '/');
              if (!p.startsWith('/')) p = `/${p}`;
              p = p.replace('/attached_assets/', '/assets/').replace(/^\/attached_assets\//, '/assets/');
              const parts = p.split('/').filter(Boolean);
              if (parts.length === 1) {
                p = `/assets/${parts[0]}`;
              }
              return p;
            })()
          : null,
        capacity: inserted.capacity,
        discountPercentage: 0,
        inStock: true,
        createdAt: inserted.created_at,
      };
      
      return res.status(201).json(product);
    }

    res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}