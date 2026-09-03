import { NextFunction, Request, Response } from 'express';
import { routeParam, sendError } from '../../lib/http';
import { listMembers, removeMember, upsertMember } from './members.service';

export async function getMembers(req: Request, res: Response, next: NextFunction) { try { res.json({ data: await listMembers(routeParam(req.params.id)) }); } catch (error) { next(error); } }
export async function addMember(req: Request, res: Response, next: NextFunction) { try { const member = await upsertMember(routeParam(req.params.id), req.body.email, req.body.role); if (!member) return sendError(res, 404, 'NOT_FOUND', 'User must register before being added.'); res.status(201).json({ data: member }); } catch (error) { next(error); } }
export async function deleteMember(req: Request, res: Response, next: NextFunction) { try { await removeMember(routeParam(req.params.id), routeParam(req.params.userId)); res.status(204).send(); } catch (error) { next(error); } }
