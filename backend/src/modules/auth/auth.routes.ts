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
// Separate limiters so registration traffic can't drain the login budget (and
// vice versa). Login counts only FAILED attempts (skipSuccessfulRequests), so a
// user logging in and out repeatedly is never locked out while brute-force
// guessing stays bounded to 20 failures per 15 minutes. Registration counts
// EVERY attempt so a single client can't mass-create accounts.
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again later.' } } });
const registerLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { error: { code: 'RATE_LIMITED', message: 'Too many registration attempts. Try again later.' } } });

router.post('/register', registerLimit, validate(registerSchema), async (req, res, next) => { try { const result = await register(req.body.name, req.body.email, req.body.password, res); if (!result) return sendError(res, 409, 'CONFLICT', 'Email is already registered.'); res.status(201).json({ data: result }); } catch (error) { next(error); } });
router.post('/login', loginLimit, validate(loginSchema), async (req, res, next) => { try { const result = await authenticateCredentials(req.body.email, req.body.password, res); if (!result) return sendError(res, 401, 'UNAUTHORIZED', 'Invalid email or password.'); res.json({ data: result }); } catch (error) { next(error); } });
router.post('/refresh', async (req, res, next) => { try { const result = await rotateRefreshToken(req.cookies.refreshToken, res); if (!result) return sendError(res, 401, 'UNAUTHORIZED', 'Refresh token is invalid.'); res.json({ data: result }); } catch (error) { next(error); } });
router.post('/logout', authenticate, async (req, res, next) => { try { const token = req.cookies.refreshToken; if (token) await prisma.refreshToken.updateMany({ where: { tokenHash: hashToken(token), userId: req.user!.id }, data: { revokedAt: new Date() } }); res.clearCookie('refreshToken'); res.status(204).send(); } catch (error) { next(error); } });
router.get('/me', authenticate, async (req, res, next) => { try { const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, name: true, email: true } }); if (!user) return sendError(res, 404, 'NOT_FOUND', 'User not found.'); res.json({ data: user }); } catch (error) { next(error); } });
export default router;
