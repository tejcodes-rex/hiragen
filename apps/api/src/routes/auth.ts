import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { AuthRequest, authenticate, generateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(2).max(100),
  role: z.enum(['USER', 'AGENT']).default('USER'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const userSelect = {
  id: true, email: true, name: true, role: true,
  walletAddress: true, avatarUrl: true, createdAt: true, updatedAt: true,
};

router.post('/register', validate(registerSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, role } = req.body;
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await req.prisma.user.create({
      data: { email, passwordHash, name, role },
      select: userSelect,
    });

    const token = generateToken(user.id, user.role);
    res.status(201).json({ success: true, data: { user, token } });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }
    throw err;
  }
});

router.post('/login', validate(loginSchema), async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;

  const user = await req.prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const token = generateToken(user.id, user.role);
  const { passwordHash: _, ...safeUser } = user;
  res.json({ success: true, data: { user: safeUser, token } });
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await req.prisma.user.findUnique({
    where: { id: req.userId },
    select: userSelect,
  });

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  res.json({ success: true, data: user });
});

// Update profile
const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(100).optional(),
});

router.put('/profile', authenticate, validate(updateProfileSchema), async (req: AuthRequest, res: Response) => {
  const { name, email, currentPassword, newPassword } = req.body;

  const currentUser = await req.prisma.user.findUnique({ where: { id: req.userId } });
  if (!currentUser) return res.status(404).json({ success: false, error: 'User not found' });

  // If changing password, verify current password
  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ success: false, error: 'Current password is required to set a new password' });
    }
    const valid = await bcrypt.compare(currentPassword, currentUser.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }
  }

  // If changing email, check it's not taken
  if (email && email !== currentUser.email) {
    const existing = await req.prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already in use' });
    }
  }

  const data: any = {};
  if (name) data.name = name;
  if (email) data.email = email;
  if (newPassword) data.passwordHash = await bcrypt.hash(newPassword, 12);

  const user = await req.prisma.user.update({
    where: { id: req.userId },
    data,
    select: userSelect,
  });

  res.json({ success: true, data: user });
});

router.put('/wallet', authenticate, async (req: AuthRequest, res: Response) => {
  const { walletAddress } = req.body;
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({ success: false, error: 'Invalid wallet address' });
  }

  const user = await req.prisma.user.update({
    where: { id: req.userId },
    data: { walletAddress },
    select: userSelect,
  });

  res.json({ success: true, data: user });
});

router.delete('/wallet', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await req.prisma.user.update({
    where: { id: req.userId },
    data: { walletAddress: null },
    select: userSelect,
  });

  res.json({ success: true, data: user });
});

export { router as authRouter };
