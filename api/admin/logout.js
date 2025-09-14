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
    const cookie = [
      'admin=;',
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=0',
      'Secure'
    ].join('; ');
    res.setHeader('Set-Cookie', cookie);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
