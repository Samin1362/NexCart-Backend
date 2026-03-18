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

/* ── Simple keyword-based chat (no external API — always works) ── */

type ProductDoc = { title: string; price: number; discountPrice: number; brand?: string; category?: { name: string } };

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const greetings = [
  "Hey there! 👋 I'm NexCart's shopping assistant. What can I help you find today?",
  "Hi! Welcome to NexCart. Looking for something specific, or just browsing?",
  "Hello! Great to see you. I can help you find products, check prices, or answer shopping questions.",
];

const farewells = [
  "Happy shopping! Come back anytime. 😊",
  "Take care! Don't forget to check our latest deals.",
  "Goodbye! Hope you found what you were looking for.",
];

const shippingReplies = [
  "We offer standard shipping (5–7 days) and express shipping (1–2 days). Free shipping on orders over $100! 🚚",
  "Standard delivery takes 5–7 business days. Express is 1–2 days. Orders above $100 ship free!",
];

const returnReplies = [
  "We have a hassle-free 30-day return policy. Just contact support and we'll sort it out. 📦",
  "You can return any item within 30 days of delivery — no questions asked!",
];

const paymentReplies = [
  "We accept all major credit/debit cards, PayPal, and more. All transactions are SSL secured. 🔒",
  "We support Visa, Mastercard, PayPal, and other payment methods. Your data is always safe with us.",
];

const discountReplies = [
  "Check out our Products page for the latest deals and discounted items! We update offers regularly. 🏷️",
  "We always have items on sale! Head to the shop and filter by discounted price to find the best deals.",
];

const helpReplies = [
  "I can help you find products, answer questions about shipping, returns, or payments. What do you need?",
  "Ask me about our products, delivery times, return policy, or anything shopping-related. I'm here to help!",
];

const defaultReplies = [
  "I'm here to help with shopping questions! You can ask me about products, shipping, returns, or deals. 🛍️",
  "That's a bit outside my expertise! I'm best at helping you find great products on NexCart. What are you looking for?",
  "I specialise in helping you shop smarter. Ask me about products, prices, or our policies!",
];

function buildReply(msg: string, products: ProductDoc[]): string {
  const m = msg.toLowerCase();

  // Greetings
  if (/\b(hi|hello|hey|howdy|good (morning|afternoon|evening)|sup|what'?s up)\b/.test(m)) {
    return pick(greetings);
  }

  // Farewell
  if (/\b(bye|goodbye|see you|take care|thanks|thank you|cheers)\b/.test(m)) {
    return pick(farewells);
  }

  // Shipping / delivery
  if (/\b(ship|shipping|deliver|delivery|how long|when will|arrive|dispatch)\b/.test(m)) {
    return pick(shippingReplies);
  }

  // Returns / refunds
  if (/\b(return|refund|exchange|send back|money back)\b/.test(m)) {
    return pick(returnReplies);
  }

  // Payment
  if (/\b(pay|payment|checkout|credit card|debit|paypal|cash|invoice|billing)\b/.test(m)) {
    return pick(paymentReplies);
  }

  // Discounts / sale
  if (/\b(discount|sale|offer|deal|promo|coupon|cheap|affordable|budget|low price|save)\b/.test(m)) {
    const onSale = products.filter((p) => p.discountPrice > 0).slice(0, 3);
    if (onSale.length) {
      const names = onSale.map((p) => `**${p.title}** ($${p.discountPrice})`).join(', ');
      return `We have some great deals right now! Check out ${names} — and many more on the shop page. 🏷️`;
    }
    return pick(discountReplies);
  }

  // Price / budget query  e.g. "under $50", "below 100"
  const priceMatch = m.match(/(?:under|below|less than|max|around|up to)\s*\$?(\d+)/);
  if (priceMatch) {
    const budget = parseFloat(priceMatch[1]);
    const affordable = products
      .filter((p) => (p.discountPrice > 0 ? p.discountPrice : p.price) <= budget)
      .slice(0, 3);
    if (affordable.length) {
      const names = affordable
        .map((p) => `**${p.title}** ($${p.discountPrice > 0 ? p.discountPrice : p.price})`)
        .join(', ');
      return `Here are some options under $${budget}: ${names}. There are more in the shop!`;
    }
    return `I couldn't find products under $${budget} right now, but check the shop — we update stock regularly!`;
  }

  // Help / capabilities
  if (/\b(help|what can you|support|assist|capabilities|what do you)\b/.test(m)) {
    return pick(helpReplies);
  }

  // Generic product search — match any word against product titles/brands
  const words = m.replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter((w) => w.length > 2);
  const matched = products.filter((p) => {
    const haystack = `${p.title} ${p.brand || ''} ${p.category?.name || ''}`.toLowerCase();
    return words.some((w) => haystack.includes(w));
  }).slice(0, 3);

  if (matched.length) {
    const names = matched
      .map((p) => {
        const price = p.discountPrice > 0 ? p.discountPrice : p.price;
        return `**${p.title}** ($${price})`;
      })
      .join(', ');
    return `I found some products that might interest you: ${names}. Check the shop for the full selection!`;
  }

  // Show a few featured products for vague queries
  if (/\b(product|item|buy|shop|browse|show|what|anything|everything|catalog|stock)\b/.test(m)) {
    const featured = products.slice(0, 3);
    if (featured.length) {
      const names = featured
        .map((p) => {
          const price = p.discountPrice > 0 ? p.discountPrice : p.price;
          return `**${p.title}** ($${price})`;
        })
        .join(', ');
      return `Here are some of our popular products: ${names}. Browse the full catalog in our shop!`;
    }
  }

  return pick(defaultReplies);
}

/* ── controllers ── */

export const chat = async (req: Request, res: Response): Promise<void> => {
  const { message } = req.body;
  if (!message) throw new BadRequestError('message is required');

  const products = await Product.find({ isActive: true })
    .select('title price discountPrice brand')
    .populate('category', 'name')
    .lean<ProductDoc[]>();

  const reply = buildReply(String(message), products);
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
