import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendError } from '../../lib/http';

const router = Router();
const aiLimit = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, message: { error: { code: 'RATE_LIMITED', message: 'Too many AI requests. Please slow down and try again shortly.' } } });

const MODEL = 'gemini-2.5-flash';
const chatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) })).min(1).max(30),
  boardId: z.string().uuid().optional(),
}).strict();

interface GeminiResponse { candidates?: { content?: { parts?: { text?: string }[] } }[] }

router.post('/ai/chat', authenticate, aiLimit, validate(chatSchema), async (req, res, next) => { try {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return sendError(res, 503, 'AI_UNAVAILABLE', 'AI assistant is not configured on the server (missing GOOGLE_API_KEY).');
  const { messages, boardId } = req.body as z.infer<typeof chatSchema>;

  let boardContext = '';
  if (boardId) {
    const board = await prisma.board.findFirst({ where: { id: boardId, members: { some: { userId: req.user!.id } } }, include: { columns: { orderBy: { position: 'asc' }, include: { tasks: { orderBy: { position: 'asc' }, select: { title: true } } } } } });
    if (board) {
      const summary = board.columns.map((column) => `- ${column.name} (${column.tasks.length} tasks): ${column.tasks.slice(0, 15).map((task) => task.title).join('; ') || 'empty'}`).join('\n');
      boardContext = `\n\nThe user is currently viewing the board "${board.name}". Its columns and tasks:\n${summary}`;
    }
  }

  const systemInstruction = { parts: [{ text: `You are FlowBoard Assistant, a concise and friendly helper embedded in a Kanban project-management app called FlowBoard. Help users plan work, break big items into subtasks, draft task descriptions, and answer questions about their board. Keep answers short and practical, and use markdown formatting when it helps.${boardContext}` }] };
  const contents = messages.map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] }));

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction, contents, generationConfig: { temperature: 0.7, maxOutputTokens: 1024 } }),
  });
  if (!response.ok) { console.error('Gemini API error', response.status, await response.text().catch(() => '')); return sendError(res, 502, 'AI_ERROR', 'The AI service returned an error. Please try again in a moment.'); }
  const data = (await response.json()) as GeminiResponse;
  const reply = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim() ?? '';
  res.json({ data: { reply: reply || "I couldn't generate a response for that. Please try rephrasing." } });
} catch (error) { next(error); } });

export default router;
