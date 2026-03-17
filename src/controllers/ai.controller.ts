import { Request, Response } from 'express';
import { GoogleGenerativeAI, GoogleGenerativeAIFetchError } from '@google/generative-ai';
import config from '../config';
import Review from '../models/review.model';
import Product from '../models/product.model';
import { sendSuccess } from '../utils/response';
import { AppError, BadRequestError } from '../utils/errors';

const getModel = () => {
  if (!config.gemini_api_key) {
    throw new AppError('AI service is currently unavailable', 503);
  }
  const genAI = new GoogleGenerativeAI(config.gemini_api_key);
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
};

const handleGeminiError = (error: unknown): never => {
  if (error instanceof AppError) throw error;

  if (error instanceof GoogleGenerativeAIFetchError && error.status === 429) {
    throw new AppError('AI service is busy, please try again later', 429);
  }

  console.error('Gemini API error:', error);
  throw new AppError('AI service encountered an error', 500);
};

export const chat = async (req: Request, res: Response): Promise<void> => {
  const { message } = req.body;

  if (!message) {
    throw new BadRequestError('message is required');
  }

  try {
    const model = getModel();

    const products = await Product.find({ isActive: true })
      .select('title price discountPrice category brand')
      .populate('category', 'name')
      .limit(50);

    const catalog = products.map((p) => {
      const cat = p.category as unknown as { name: string };
      return `- ${p.title} ($${p.discountPrice > 0 ? p.discountPrice : p.price}, ${cat?.name || 'Uncategorized'}, ${p.brand || 'No brand'})`;
    }).join('\n');

    const prompt = `You are NexCart's shopping assistant. You help customers find products, answer questions about shopping, and provide recommendations.

Available products in our store:
${catalog}

Customer question: ${message}

Provide a helpful, concise response. If recommending products, mention specific items from the catalog above. If the question is unrelated to shopping, politely redirect to shopping topics.`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    sendSuccess(res, 200, 'Chat response generated', { reply });
  } catch (error) {
    handleGeminiError(error);
  }
};

export const generateDescription = async (req: Request, res: Response): Promise<void> => {
  const { title, category } = req.body;

  if (!title) {
    throw new BadRequestError('title is required');
  }

  try {
    const model = getModel();

    const prompt = `Write a compelling e-commerce product description for the following product:

Product: ${title}
Category: ${category || 'General'}

Requirements:
- Write 2-3 paragraphs
- Highlight key features and benefits
- Use persuasive but professional language
- Do not use markdown formatting, just plain text paragraphs`;

    const result = await model.generateContent(prompt);
    const description = result.response.text();

    sendSuccess(res, 200, 'Description generated successfully', { description });
  } catch (error) {
    handleGeminiError(error);
  }
};

export const reviewSummary = async (req: Request, res: Response): Promise<void> => {
  const { productId } = req.body;

  if (!productId) {
    throw new BadRequestError('productId is required');
  }

  const reviews = await Review.find({ productId }).populate('userId', 'name');

  if (reviews.length === 0) {
    sendSuccess(res, 200, 'No reviews to summarize', {
      summary: 'No reviews available for this product yet.',
      sentiment: 'neutral',
    });
    return;
  }

  try {
    const model = getModel();

    const reviewTexts = reviews.map((r) => {
      const user = r.userId as unknown as { name: string };
      return `- Rating: ${r.rating}/5, Comment: "${r.comment}" (by ${user?.name || 'Anonymous'})`;
    }).join('\n');

    const prompt = `Summarize the following product reviews into a concise paragraph. Also determine the overall sentiment.

Reviews:
${reviewTexts}

Respond in this exact JSON format (no markdown, no code blocks, just raw JSON):
{"summary": "your summary here", "sentiment": "positive" or "negative" or "mixed" or "neutral"}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    let parsed;
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
  } catch (error) {
    handleGeminiError(error);
  }
};
