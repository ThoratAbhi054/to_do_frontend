import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, password } = req.body;

  try {
    // Here you would typically verify against your database
    // This is just an example
    if (email === 'test@example.com' && password === 'password') {
      const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
      
      res.status(200).json({
        token,
        user: { email }
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
} 