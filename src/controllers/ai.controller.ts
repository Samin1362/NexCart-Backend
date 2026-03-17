import { Request, Response } from 'express';
import { GoogleGenerativeAI, GoogleGenerativeAIFetchError } from '@google/generative-ai';
import config from '../config';
import Review from '../models/review.model';
import Product from '../models/product.model';
import { sendSuccess } from '../utils/response';
import { AppError, BadRequestError } from '../utils/errors';

/* ── helpers ── */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getModel = () => {
  if (!config.gemini_api_key) {
    throw new AppError('AI service is currently unavailable', 503);
  }
  const genAI = new GoogleGenerativeAI(config.gemini_api_key);
  // gemini-2.0-flash-lite: 30 RPM (vs 15 RPM for flash) — better for free-tier usage
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
};

/**
 * Calls Gemini with automatic retry on 429 rate-limit.
 * Retries up to 2 times with a 5-second pause between each attempt.
 */
const generate = async (prompt: string): Promise<string> => {
  const model = getModel();
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      const isRateLimit =
        error instanceof GoogleGenerativeAIFetchError && error.status === 429;

      if (isRateLimit && attempt < maxAttempts) {
        console.warn(`Gemini rate-limited (attempt ${attempt}/${maxAttempts}). Retrying in 5s…`);
        await sleep(5000);
        continue;
      }

      // Not a rate-limit, or we've exhausted retries — re-throw
      if (error instanceof AppError) throw error;

      if (isRateLimit) {
        throw new AppError('AI service is rate-limited. Please wait a moment and try again.', 429);
      }

      console.error('Gemini API error:', error);
      throw new AppError('AI service encountered an error', 500);
    }
  }

  // Should never reach here, but satisfy TypeScript
  throw new AppError('AI service failed after multiple retries', 503);
};

/* ── controllers ── */

export const chat = async (req: Request, res: Response): Promise<void> => {
  const { message } = req.body;
  if (!message) throw new BadRequestError('message is required');

  const products = await Product.find({ isActive: true })
    .select('title price discountPrice category brand')
    .populate('category', 'name')
    .limit(15);

  const catalog = products
    .map((p) => {
      const cat = p.category as unknown as { name: string };
      const price = p.discountPrice > 0 ? p.discountPrice : p.price;
      return `${p.title} | $${price} | ${cat?.name || 'General'} | ${p.brand || ''}`.trim();
    })
    .join('\n');

  const prompt = `You are NexCart's friendly shopping assistant. Help customers find products and answer shopping questions briefly.

Products (title | price | category | brand):
${catalog}

Customer: ${message}

Reply in 2-3 sentences. Recommend specific products by name when relevant. If off-topic, redirect to shopping.`;

  const reply = await generate(prompt);
  sendSuccess(res, 200, 'Chat response generated', { reply });
};

export const generateDescription = async (req: Request, res: Response): Promise<void> => {
  const { title, category } = req.body;
  if (!title) throw new BadRequestError('title is required');

  const prompt = `Write a compelling e-commerce product description for:

Product: ${title}
Category: ${category || 'General'}

Requirements:
- Write 2-3 paragraphs
- Highlight key features and benefits
- Use persuasive but professional language
- Plain text only, no markdown`;

  const description = await generate(prompt);
  sendSuccess(res, 200, 'Description generated successfully', { description });
};

export const reviewSummary = async (req: Request, res: Response): Promise<void> => {
  const { productId } = req.body;
  if (!productId) throw new BadRequestError('productId is required');

  const reviews = await Review.find({ productId }).populate('userId', 'name');

  if (reviews.length === 0) {
    sendSuccess(res, 200, 'No reviews to summarize', {
      summary: 'No reviews available for this product yet.',
      sentiment: 'neutral',
    });
    return;
  }

  const reviewTexts = reviews
    .map((r) => {
      const user = r.userId as unknown as { name: string };
      return `- Rating: ${r.rating}/5, Comment: "${r.comment}" (by ${user?.name || 'Anonymous'})`;
    })
    .join('\n');

  const prompt = `Summarize these product reviews in one concise paragraph and determine the overall sentiment.

Reviews:
${reviewTexts}

Respond in this exact JSON format (raw JSON only, no markdown):
{"summary": "your summary here", "sentiment": "positive" or "negative" or "mixed" or "neutral"}`;

  const text = (await generate(prompt)).trim();

  let parsed: { summary: string; sentiment: string };
  try {
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(jsonStr);
  } catch {
    parsed = { summary: text, sentiment: 'neutral' };
  }

  sendSuccess(res, 200, 'Review summary generated', {
    summary: parsed.summary,
    sentiment: parsed.sentiment,
    reviewCount: reviews.length,
  });
};
