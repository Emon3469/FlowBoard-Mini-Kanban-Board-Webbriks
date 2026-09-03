import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { loadBoardContext } from '../../middleware/boardContext';
import { validate } from '../../middleware/validate';
import { memberSchema } from './members.schemas';
import { addMember, deleteMember, getMembers } from './members.controller';

const router = Router();
router.use(authenticate);
router.get('/boards/:id/members', loadBoardContext, requireRole('VIEWER'), getMembers);
router.post('/boards/:id/members', loadBoardContext, requireRole('OWNER'), validate(memberSchema), addMember);
router.delete('/boards/:id/members/:userId', loadBoardContext, requireRole('OWNER'), deleteMember);
export default router;
