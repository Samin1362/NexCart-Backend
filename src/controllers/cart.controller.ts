import { Request, Response } from 'express';
import Cart from '../models/cart.model';
import Product from '../models/product.model';
import { sendSuccess } from '../utils/response';
import { BadRequestError, NotFoundError } from '../utils/errors';

const calcTotal = (items: { price: number; quantity: number }[]): number => {
  return Math.round(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;
};

export const getCart = async (req: Request, res: Response): Promise<void> => {
  const cart = await Cart.findOne({ userId: req.user!._id })
    .populate('items.productId', 'title images stock isActive slug');

  if (!cart) {
    sendSuccess(res, 200, 'Cart is empty', { userId: req.user!._id, items: [], totalAmount: 0 });
    return;
  }

  sendSuccess(res, 200, 'Cart fetched successfully', cart);
};

export const addItem = async (req: Request, res: Response): Promise<void> => {
  const { productId, quantity = 1 } = req.body;

  if (!productId) {
    throw new BadRequestError('productId is required');
  }

  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  let cart = await Cart.findOne({ userId: req.user!._id });

  if (!cart) {
    cart = await Cart.create({
      userId: req.user!._id,
      items: [],
      totalAmount: 0,
    });
  }

  const existingIndex = cart.items.findIndex(
    (item) => item.productId.toString() === productId
  );

  if (existingIndex > -1) {
    const newQty = cart.items[existingIndex].quantity + quantity;
    if (newQty > product.stock) {
      throw new BadRequestError(`Only ${product.stock} items available in stock`);
    }
    cart.items[existingIndex].quantity = newQty;
  } else {
    if (quantity > product.stock) {
      throw new BadRequestError(`Only ${product.stock} items available in stock`);
    }
    const snapshotPrice = product.discountPrice > 0 ? product.discountPrice : product.price;
    cart.items.push({ productId: product._id, quantity, price: snapshotPrice });
  }

  cart.totalAmount = calcTotal(cart.items);
  await cart.save();

  const populated = await Cart.findById(cart._id)
    .populate('items.productId', 'title images stock isActive slug');

  sendSuccess(res, 200, 'Item added to cart', populated);
};

export const updateItem = async (req: Request, res: Response): Promise<void> => {
  const { productId, quantity } = req.body;

  if (!productId || quantity === undefined) {
    throw new BadRequestError('productId and quantity are required');
  }

  const cart = await Cart.findOne({ userId: req.user!._id });
  if (!cart) {
    throw new NotFoundError('Cart not found');
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.productId.toString() === productId
  );

  if (itemIndex === -1) {
    throw new NotFoundError('Item not found in cart');
  }

  if (quantity <= 0) {
    cart.items.splice(itemIndex, 1);
  } else {
    const product = await Product.findById(productId);
    if (product && quantity > product.stock) {
      throw new BadRequestError(`Only ${product.stock} items available in stock`);
    }
    cart.items[itemIndex].quantity = quantity;
  }

  cart.totalAmount = calcTotal(cart.items);
  await cart.save();

  const populated = await Cart.findById(cart._id)
    .populate('items.productId', 'title images stock isActive slug');

  sendSuccess(res, 200, 'Cart updated successfully', populated);
};

export const removeItem = async (req: Request, res: Response): Promise<void> => {
  const { productId } = req.params;

  const cart = await Cart.findOne({ userId: req.user!._id });
  if (!cart) {
    throw new NotFoundError('Cart not found');
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.productId.toString() === productId
  );

  if (itemIndex === -1) {
    throw new NotFoundError('Item not found in cart');
  }

  cart.items.splice(itemIndex, 1);
  cart.totalAmount = calcTotal(cart.items);
  await cart.save();

  const populated = await Cart.findById(cart._id)
    .populate('items.productId', 'title images stock isActive slug');

  sendSuccess(res, 200, 'Item removed from cart', populated);
};

export const clearCart = async (req: Request, res: Response): Promise<void> => {
  const cart = await Cart.findOne({ userId: req.user!._id });
  if (!cart) {
    throw new NotFoundError('Cart not found');
  }

  cart.items = [];
  cart.totalAmount = 0;
  await cart.save();

  sendSuccess(res, 200, 'Cart cleared successfully', cart);
};
