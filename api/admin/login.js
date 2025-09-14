export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body || {};
    if (username?.toLowerCase() === 'giorgi' && password === 'random12') {
      const cookie = [
        'admin=1',
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        'Max-Age=604800', // 7 days
        'Secure'
      ].join('; ');
      res.setHeader('Set-Cookie', cookie);
      return res.status(200).json({ isAuthenticated: true });
    }
    return res.status(401).json({ isAuthenticated: false, message: 'Invalid credentials' });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
