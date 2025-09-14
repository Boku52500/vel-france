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

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const cookieHeader = req.headers['cookie'] || '';
    const isAuthed = cookieHeader.includes('admin=1');
    return res.status(200).json({ isAuthenticated: isAuthed });
  } catch (error) {
    console.error('Admin auth check error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
