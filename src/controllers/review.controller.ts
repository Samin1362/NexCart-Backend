import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Review from '../models/review.model';
import Product from '../models/product.model';
import { sendSuccess } from '../utils/response';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';

const recalculateProductRating = async (productId: mongoose.Types.ObjectId | string): Promise<void> => {
  const result = await Review.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId.toString()) } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  if (result.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      rating: Math.round(result[0].avgRating * 10) / 10,
      reviewCount: result[0].count,
    });
  } else {
    await Product.findByIdAndUpdate(productId, { rating: 0, reviewCount: 0 });
  }
};

export const createReview = async (req: Request, res: Response): Promise<void> => {
  const { productId, rating, comment } = req.body;

  if (!productId || rating === undefined || !comment) {
    throw new BadRequestError('productId, rating and comment are required');
  }

  if (rating < 1 || rating > 5) {
    throw new BadRequestError('Rating must be between 1 and 5');
  }

  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  const existing = await Review.findOne({ productId, userId: req.user!._id });
  if (existing) {
    throw new ConflictError('You have already reviewed this product');
  }

  const review = await Review.create({
    userId: req.user!._id,
    productId,
    rating,
    comment,
  });

  await recalculateProductRating(productId);

  const populated = await Review.findById(review._id).populate('userId', 'name avatar');

  sendSuccess(res, 201, 'Review created successfully', populated);
};

export const getMyReviews = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    Review.find({ userId: req.user!._id })
      .populate('productId', 'title slug images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments({ userId: req.user!._id }),
  ]);

  sendSuccess(res, 200, 'My reviews fetched successfully', reviews, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
};

export const getReviewsByProduct = async (req: Request, res: Response): Promise<void> => {
  const { productId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    Review.find({ productId })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments({ productId }),
  ]);

  sendSuccess(res, 200, 'Reviews fetched successfully', reviews, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
};

export const getTopReviews = async (_req: Request, res: Response): Promise<void> => {
  const reviews = await Review.find({ rating: { $gte: 4 } })
    .sort({ rating: -1, createdAt: -1 })
    .limit(6)
    .populate('userId', 'name')
    .populate('productId', 'title')
    .lean();

  const data = reviews.map((r) => ({
    _id: r._id,
    rating: r.rating,
    comment: r.comment,
    reviewer: (r.userId as unknown as { name: string })?.name ?? 'Anonymous',
    productTitle: (r.productId as unknown as { title: string })?.title ?? '',
    createdAt: r.createdAt,
  }));

  sendSuccess(res, 200, 'Top reviews fetched', data);
};

export const deleteReview = async (req: Request, res: Response): Promise<void> => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    throw new NotFoundError('Review not found');
  }

  if (review.userId.toString() !== req.user!._id && req.user!.role !== 'ADMIN') {
    throw new ForbiddenError('You can only delete your own reviews');
  }

  const productId = review.productId;
  await Review.findByIdAndDelete(req.params.id);
  await recalculateProductRating(productId);

  sendSuccess(res, 200, 'Review deleted successfully');
};
