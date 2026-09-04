import { Router } from 'express';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Serves the Vapi Web SDK config. The PUBLIC key is safe to expose to the
// browser; the private key never leaves the server. If an assistant was created
// in the Vapi dashboard, set VAPI_ASSISTANT_ID and the client will use it;
// otherwise a transient inline assistant is returned.
router.get('/support/config', authenticate, (_req, res) => {
  const publicKey = process.env.VAPI_PUBLIC_KEY;
  if (!publicKey) return res.json({ data: { enabled: false } });
  const assistantId = process.env.VAPI_ASSISTANT_ID;
  res.json({
    data: {
      enabled: true,
      publicKey,
      assistantId: assistantId || null,
      assistant: assistantId
        ? undefined
        : {
            name: 'FlowBoard Support',
            firstMessage: "Hi! I'm the FlowBoard support assistant. How can I help you today?",
            model: {
              provider: 'openai',
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content:
                    'You are a friendly voice support agent for FlowBoard, a Kanban project-management app. Help users with features: creating boards and projects, columns, tasks, drag-and-drop, List/Kanban/Timeline views, filtering, sorting, grouping, import/export, notes, reports, notifications and the inbox, favorites, dark mode, sharing boards with roles (owner, editor, viewer), automations/workflows, and integrations. Keep answers brief and easy to follow when spoken aloud.',
                },
              ],
            },
            voice: { provider: '11labs', voiceId: 'burt' },
          },
    },
  });
});

export default router;
