import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI, type Content, type Part } from '@google/genai';

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';

interface IncomingColumn {
  id: string;
  index: number;
  title: string;
  description: string;
  imageUrl: string | null;
}

interface IncomingMessage {
  role: 'user' | 'model';
  text: string;
  focusColumnId?: string;
}

interface ChatRequestBody {
  messages: IncomingMessage[];
  columns?: IncomingColumn[];
  includeColumns?: boolean;
  focusColumnId?: string;
}

const ASSETS_IMAGES_DIR = path.resolve(process.cwd(), 'src', 'assets', 'images');

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function resolveImageToPart(imageUrl: string | null): Part | null {
  if (!imageUrl) {
    return null;
  }

  // Handle client-uploaded data URLs
  const dataUrlMatch = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(imageUrl);
  if (dataUrlMatch) {
    return {
      inlineData: {
        mimeType: dataUrlMatch[1],
        data: dataUrlMatch[2],
      },
    };
  }

  // Handle bundled starter images under /src/assets/images/
  if (imageUrl.startsWith('/src/assets/images/')) {
    const fileName = path.basename(imageUrl);
    const resolved = path.resolve(ASSETS_IMAGES_DIR, fileName);
    if (!resolved.startsWith(ASSETS_IMAGES_DIR + path.sep)) {
      return null;
    }
    if (!fs.existsSync(resolved)) {
      return null;
    }
    const ext = path.extname(fileName).toLowerCase();
    const mimeType =
      ext === '.png'
        ? 'image/png'
        : ext === '.webp'
          ? 'image/webp'
          : ext === '.gif'
            ? 'image/gif'
            : 'image/jpeg';
    const fileBuffer = fs.readFileSync(resolved);
    return {
      inlineData: {
        mimeType,
        data: fileBuffer.toString('base64'),
      },
    };
  }

  return null;
}

function formatGeminiError(error: unknown): { status: number; message: string } {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED') || msg.includes('403')) {
      return {
        status: 403,
        message: 'Gemini API key is missing or invalid. Please check your key in the Settings > Secrets panel.',
      };
    }
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
      return {
        status: 429,
        message: 'Rate limit reached. Please wait a moment before sending another message.',
      };
    }
    if (msg.includes('NOT_FOUND') || msg.includes('404')) {
      return {
        status: 404,
        message: 'The configured Gemini model could not be found.',
      };
    }
    return { status: 500, message: msg };
  }
  return { status: 500, message: 'An unexpected error occurred while contacting Lumen.' };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/chat', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(400).json({
        error: 'Gemini API key is not configured. Please add GEMINI_API_KEY in Settings > Secrets.',
      });
      return;
    }

    const body = req.body as ChatRequestBody;
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required.' });
      return;
    }

    const columns = Array.isArray(body.columns) ? body.columns : [];
    const includeColumns = body.includeColumns !== false;
    const focusColumnId = body.focusColumnId;

    // Build multimodal board context parts if enabled and pictures/descriptions exist
    const boardContextParts: Part[] = [];
    if (includeColumns && columns.length > 0) {
      const populatedColumns = columns.filter(
        (c) => Boolean(c.imageUrl) || Boolean(c.description?.trim()) || Boolean(c.title?.trim()),
      );

      if (populatedColumns.length > 0) {
        boardContextParts.push({
          text:
            'Here are the visitor’s current Picture Columns on the studio board. Use these images and descriptions naturally when relevant to the conversation:\n',
        });

        for (const col of populatedColumns) {
          const isFocused = focusColumnId && col.id === focusColumnId;
          const label = `Column ${String(col.index).padStart(2, '0')}${isFocused ? ' (FOCUSED BY VISITOR)' : ''}`;
          const titleLine = col.title?.trim() ? `Title: ${col.title.trim()}` : 'Title: Untitled';
          const descLine = col.description?.trim()
            ? `Visitor Description: ${col.description.trim()}`
            : 'Visitor Description: (none written yet)';

          boardContextParts.push({
            text: `\n--- ${label} ---\n${titleLine}\n${descLine}\n`,
          });

          const imgPart = resolveImageToPart(col.imageUrl);
          if (imgPart) {
            boardContextParts.push(imgPart);
          }
        }
      }
    }

    // Build multi-turn contents history
    const contents: Content[] = [];
    const historyMessages = body.messages.slice(-16);

    for (let i = 0; i < historyMessages.length; i++) {
      const msg = historyMessages[i];
      const isLastUserMessage = i === historyMessages.length - 1 && msg.role === 'user';

      if (isLastUserMessage && boardContextParts.length > 0) {
        contents.push({
          role: 'user',
          parts: [...boardContextParts, { text: `\nVisitor message: ${msg.text}` }],
        });
      } else {
        contents.push({
          role: msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.text }],
        });
      }
    }

    const systemInstruction = `You are Lumen, a warm, perceptive, and articulate AI conversational companion inside Lumen Folio—an interactive visual studio where visitors talk with you and attach pictures with descriptions in side-by-side columns.

Your style:
- Speak naturally, warmly, and thoughtfully like an insightful creative studio partner and good conversationalist.
- When the visitor shares pictures or writes descriptions in their columns, observe concrete visual details (light, composition, texture, mood, subject, contrast) and connect them to the visitor's own words and descriptions.
- If the visitor asks general questions or just wants to chat without referring to the pictures, converse naturally about whatever topic they bring up.
- Keep responses clear, well-paced, and readable—avoid bloated filler, robotic disclaimers, or overly long walls of text unless the visitor asks for depth.
- Ask occasional curious, open-ended follow-up questions to keep the dialogue engaging.`;

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      const stream = await ai.models.generateContentStream({
        model: MODEL_NAME,
        contents,
        config: {
          systemInstruction,
        },
      });

      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error) {
      const formatted = formatGeminiError(error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: formatted.message })}\n\n`);
      res.end();
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lumen Folio server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
