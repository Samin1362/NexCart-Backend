import { Request, Response } from 'express';
import User from '../models/user.model';
import Product from '../models/product.model';
import { sendSuccess } from '../utils/response';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { Types } from 'mongoose';

// POST /api/wishlist/:productId — add if absent, remove if present
export const toggleWishlist = async (req: Request, res: Response): Promise<void> => {
  const productId = req.params.productId as string;

  if (!Types.ObjectId.isValid(productId)) {
    throw new BadRequestError('Invalid productId');
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  const user = await User.findById(req.user!._id);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const wishlist = user.wishlist as Types.ObjectId[];
  const alreadyWishlisted = wishlist.some((id) => id.toString() === productId);

  if (alreadyWishlisted) {
    await User.findByIdAndUpdate(req.user!._id, { $pull: { wishlist: new Types.ObjectId(productId) } });
    const updated = await User.findById(req.user!._id);
    sendSuccess(res, 200, 'Removed from wishlist', {
      wishlisted: false,
      wishlistCount: (updated!.wishlist as Types.ObjectId[]).length,
    });
  } else {
    await User.findByIdAndUpdate(req.user!._id, { $addToSet: { wishlist: new Types.ObjectId(productId) } });
    const updated = await User.findById(req.user!._id);
    sendSuccess(res, 200, 'Added to wishlist', {
      wishlisted: true,
      wishlistCount: (updated!.wishlist as Types.ObjectId[]).length,
    });
  }
};

// GET /api/wishlist — return populated wishlist for current user
export const getWishlist = async (req: Request, res: Response): Promise<void> => {
  const user = await User.findById(req.user!._id).populate(
    'wishlist',
    '_id title slug price discountPrice images stock isActive category brand rating reviewCount'
  );

  if (!user) {
    throw new NotFoundError('User not found');
  }

  sendSuccess(res, 200, 'Wishlist fetched successfully', {
    wishlist: user.wishlist,
    wishlistCount: user.wishlist.length,
  });
};

// DELETE /api/wishlist/:productId — remove one item (idempotent)
export const removeFromWishlist = async (req: Request, res: Response): Promise<void> => {
  const productId = req.params.productId as string;

  if (!Types.ObjectId.isValid(productId)) {
    throw new BadRequestError('Invalid productId');
  }

  await User.findByIdAndUpdate(req.user!._id, { $pull: { wishlist: new Types.ObjectId(productId) } });

  const updated = await User.findById(req.user!._id);
  sendSuccess(res, 200, 'Removed from wishlist', {
    wishlistCount: updated ? (updated.wishlist as Types.ObjectId[]).length : 0,
  });
};

// DELETE /api/wishlist — clear entire wishlist
export const clearWishlist = async (req: Request, res: Response): Promise<void> => {
  await User.findByIdAndUpdate(req.user!._id, { $set: { wishlist: [] } });

  sendSuccess(res, 200, 'Wishlist cleared', { wishlistCount: 0 });
};

// GET /api/wishlist/check/:productId — returns { wishlisted: true/false }
export const checkWishlistStatus = async (req: Request, res: Response): Promise<void> => {
  const productId = req.params.productId as string;

  if (!Types.ObjectId.isValid(productId)) {
    throw new BadRequestError('Invalid productId');
  }

  const user = await User.findById(req.user!._id);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const wishlist = user.wishlist as Types.ObjectId[];
  const wishlisted = wishlist.some((id) => id.toString() === productId);

  sendSuccess(res, 200, 'Wishlist status fetched', { wishlisted });
};
