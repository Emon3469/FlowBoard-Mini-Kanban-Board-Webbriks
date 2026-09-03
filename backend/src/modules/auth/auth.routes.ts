import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendError } from '../../lib/http';
import { issuePair, register, authenticateCredentials, rotateRefreshToken } from './auth.service';
import { loginSchema, registerSchema } from './auth.schemas';
import { prisma } from '../../lib/prisma';
import { hashToken } from '../../lib/auth';

const router = Router();
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, message: { error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts. Try again later.' } } });

router.post('/register', authLimit, validate(registerSchema), async (req, res, next) => { try { const result = await register(req.body.name, req.body.email, req.body.password, res); if (!result) return sendError(res, 409, 'CONFLICT', 'Email is already registered.'); res.status(201).json({ data: result }); } catch (error) { next(error); } });
router.post('/login', authLimit, validate(loginSchema), async (req, res, next) => { try { const result = await authenticateCredentials(req.body.email, req.body.password, res); if (!result) return sendError(res, 401, 'UNAUTHORIZED', 'Invalid email or password.'); res.json({ data: result }); } catch (error) { next(error); } });
router.post('/refresh', async (req, res, next) => { try { const result = await rotateRefreshToken(req.cookies.refreshToken, res); if (!result) return sendError(res, 401, 'UNAUTHORIZED', 'Refresh token is invalid.'); res.json({ data: result }); } catch (error) { next(error); } });
router.post('/logout', authenticate, async (req, res, next) => { try { const token = req.cookies.refreshToken; if (token) await prisma.refreshToken.updateMany({ where: { tokenHash: hashToken(token), userId: req.user!.id }, data: { revokedAt: new Date() } }); res.clearCookie('refreshToken'); res.status(204).send(); } catch (error) { next(error); } });
export default router;
