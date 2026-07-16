import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { UPLOADS_DIR } from './db.js';

export const integrationsRouter = Router();

// ── File upload ──────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const safe = path.basename(file.originalname).replace(/[^\w.\-]+/g, '_');
    cb(null, `${crypto.randomBytes(8).toString('hex')}-${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

integrationsRouter.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file provided' });
  res.json({ file_url: `/uploads/${req.file.filename}` });
});

// ── Email ────────────────────────────────────────────────────────────────────
integrationsRouter.post('/send-email', async (req, res) => {
  const { to, subject, body, from_name } = req.body || {};
  if (!to || !subject) return res.status(400).json({ message: 'Recipient and subject are required' });
  if (!process.env.SMTP_URL) {
    console.log(`[email] SMTP not configured — email to ${to} (“${subject}”) was NOT sent.`);
    return res.status(200).json({ ok: false, skipped: true, message: 'Email not sent: no SMTP server configured (set SMTP_URL).' });
  }
  try {
    const { default: nodemailer } = await import('nodemailer');
    const transport = nodemailer.createTransport(process.env.SMTP_URL);
    await transport.sendMail({
      from: from_name ? `"${from_name}" <${process.env.SMTP_FROM || 'noreply@localhost'}>` : (process.env.SMTP_FROM || 'noreply@localhost'),
      to,
      subject,
      html: body,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[email] send failed:', err.message);
    res.status(502).json({ message: `Email failed to send: ${err.message}` });
  }
});

// ── LLM (Anthropic Claude) ───────────────────────────────────────────────────
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';

function withAdditionalPropsFalse(schema) {
  if (Array.isArray(schema)) return schema.map(withAdditionalPropsFalse);
  if (schema && typeof schema === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(schema)) out[k] = withAdditionalPropsFalse(v);
    if (out.type === 'object') {
      out.additionalProperties = false;
      if (out.properties && !out.required) out.required = Object.keys(out.properties);
    }
    return out;
  }
  return schema;
}

function fileBlockFromUrl(fileUrl) {
  if (!fileUrl?.startsWith('/uploads/')) return null;
  const filePath = path.join(UPLOADS_DIR, path.basename(fileUrl));
  if (!fs.existsSync(filePath)) return null;
  const data = fs.readFileSync(filePath).toString('base64');
  const ext = path.extname(filePath).toLowerCase();
  const imageTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
  if (imageTypes[ext]) {
    return { type: 'image', source: { type: 'base64', media_type: imageTypes[ext], data } };
  }
  if (ext === '.pdf') {
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } };
  }
  return null;
}

function extractJson(text) {
  const stripped = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  try { return JSON.parse(stripped); } catch { /* fall through */ }
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start !== -1 && end > start) return JSON.parse(stripped.slice(start, end + 1));
  throw new Error('Model did not return valid JSON');
}

integrationsRouter.post('/invoke-llm', async (req, res) => {
  const { prompt, response_json_schema, add_context_from_internet, file_urls } = req.body || {};
  if (!prompt) return res.status(400).json({ message: 'A prompt is required' });
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ message: 'AI is not configured. Set ANTHROPIC_API_KEY on the server to enable AI features.' });
  }

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic();

    const content = [];
    for (const url of file_urls || []) {
      const block = fileBlockFromUrl(url);
      if (block) content.push(block);
    }
    let promptText = prompt;
    // Structured outputs don't combine with server tools, so when web search is
    // on the schema is enforced by instruction + parsing instead.
    const useNativeSchema = response_json_schema && !add_context_from_internet;
    if (response_json_schema && !useNativeSchema) {
      promptText += `\n\nRespond ONLY with a JSON object matching this JSON schema, with no surrounding text or code fences:\n${JSON.stringify(response_json_schema)}`;
    }
    content.push({ type: 'text', text: promptText });

    const request = {
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content }],
    };
    if (add_context_from_internet) {
      request.tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }];
    }
    if (useNativeSchema) {
      request.output_config = { format: { type: 'json_schema', schema: withAdditionalPropsFalse(response_json_schema) } };
    }

    let response = await client.messages.create(request);
    // Server tools can pause the turn; resume until finished.
    let guard = 0;
    while (response.stop_reason === 'pause_turn' && guard++ < 5) {
      request.messages = [...request.messages, { role: 'assistant', content: response.content }];
      response = await client.messages.create(request);
    }
    if (response.stop_reason === 'refusal') {
      return res.status(422).json({ message: 'The AI declined to answer this request.' });
    }

    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
    if (response_json_schema) {
      return res.json({ result: extractJson(text) });
    }
    res.json({ result: text });
  } catch (err) {
    console.error('[llm] request failed:', err.message);
    const status = err.status && err.status >= 400 && err.status < 500 ? 502 : 500;
    res.status(status).json({ message: `AI request failed: ${err.message}` });
  }
});
