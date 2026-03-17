import { Schema, model } from 'mongoose';
import { IReview } from '../types';

const reviewSchema = new Schema<IReview>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must be at most 5'],
    },
    comment: {
      type: String,
      required: [true, 'Comment is required'],
      minlength: [5, 'Comment must be at least 5 characters'],
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
reviewSchema.index({ productId: 1, createdAt: -1 });

const Review = model<IReview>('Review', reviewSchema);

export default Review;
