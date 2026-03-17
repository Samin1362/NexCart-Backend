import { Request, Response } from 'express';
import Order from '../models/order.model';
import Cart from '../models/cart.model';
import Product from '../models/product.model';
import { sendSuccess } from '../utils/response';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';

const generateOrderNumber = async (): Promise<string> => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `NC-${dateStr}`;

  const lastOrder = await Order.findOne({ orderNumber: { $regex: `^${prefix}` } })
    .sort({ orderNumber: -1 });

  let seq = 1;
  if (lastOrder) {
    const lastSeq = parseInt(lastOrder.orderNumber.split('-')[2]);
    seq = lastSeq + 1;
  }

  return `${prefix}-${String(seq).padStart(5, '0')}`;
};

const SHIPPING_FREE_THRESHOLD = 100;
const SHIPPING_FLAT_RATE = 10;
const TAX_RATE = 0.05;

export const placeOrder = async (req: Request, res: Response): Promise<void> => {
  const { shippingAddress, paymentMethod, notes } = req.body;

  if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zipCode || !shippingAddress.country) {
    throw new BadRequestError('Complete shipping address is required');
  }

  if (!paymentMethod) {
    throw new BadRequestError('Payment method is required');
  }

  const cart = await Cart.findOne({ userId: req.user!._id });
  if (!cart || cart.items.length === 0) {
    throw new BadRequestError('Cart is empty');
  }

  const orderItems = [];
  let subtotal = 0;

  for (const cartItem of cart.items) {
    const product = await Product.findOne({ _id: cartItem.productId, isActive: true });

    if (!product) {
      throw new BadRequestError(`Product no longer available`);
    }

    if (product.stock < cartItem.quantity) {
      throw new BadRequestError(`Insufficient stock for "${product.title}". Available: ${product.stock}`);
    }

    orderItems.push({
      productId: product._id,
      title: product.title,
      price: cartItem.price,
      quantity: cartItem.quantity,
      image: product.images[0] || '',
    });

    subtotal += cartItem.price * cartItem.quantity;
  }

  subtotal = Math.round(subtotal * 100) / 100;
  const shippingCost = subtotal >= SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_FLAT_RATE;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const totalAmount = Math.round((subtotal + shippingCost + tax) * 100) / 100;

  const orderNumber = await generateOrderNumber();

  const order = await Order.create({
    orderNumber,
    userId: req.user!._id,
    items: orderItems,
    shippingAddress,
    paymentMethod,
    paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PAID',
    subtotal,
    shippingCost,
    tax,
    totalAmount,
    notes,
  });

  for (const cartItem of cart.items) {
    await Product.findByIdAndUpdate(cartItem.productId, {
      $inc: { stock: -cartItem.quantity, sold: cartItem.quantity },
    });
  }

  cart.items = [];
  cart.totalAmount = 0;
  await cart.save();

  sendSuccess(res, 201, 'Order placed successfully', order);
};

export const getUserOrders = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find({ userId: req.user!._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments({ userId: req.user!._id }),
  ]);

  sendSuccess(res, 200, 'Orders fetched successfully', orders, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
};

export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};

  if (status) {
    filter.orderStatus = status;
  }

  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate + 'T23:59:59.999Z');
    filter.createdAt = dateFilter;
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  sendSuccess(res, 200, 'Orders fetched successfully', orders, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
};

export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  const order = await Order.findById(req.params.id).populate('userId', 'name email');

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.userId._id.toString() !== req.user!._id && req.user!.role !== 'ADMIN') {
    throw new ForbiddenError('You can only view your own orders');
  }

  sendSuccess(res, 200, 'Order fetched successfully', order);
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  const { orderStatus } = req.body;

  if (!orderStatus) {
    throw new BadRequestError('orderStatus is required');
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  const allowed = VALID_TRANSITIONS[order.orderStatus];
  if (!allowed || !allowed.includes(orderStatus)) {
    throw new BadRequestError(`Cannot transition from ${order.orderStatus} to ${orderStatus}`);
  }

  order.orderStatus = orderStatus;

  if (orderStatus === 'DELIVERED') {
    order.deliveredAt = new Date();
    order.paymentStatus = 'PAID';
  }

  if (orderStatus === 'CANCELLED') {
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity, sold: -item.quantity },
      });
    }
    if (order.paymentStatus === 'PAID') {
      order.paymentStatus = 'REFUNDED';
    }
  }

  await order.save();

  sendSuccess(res, 200, 'Order status updated successfully', order);
};

export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
  const { cancelReason } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.userId.toString() !== req.user!._id) {
    throw new ForbiddenError('You can only cancel your own orders');
  }

  if (order.orderStatus !== 'PENDING') {
    throw new BadRequestError('Only PENDING orders can be cancelled by the user');
  }

  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stock: item.quantity, sold: -item.quantity },
    });
  }

  order.orderStatus = 'CANCELLED';
  order.cancelReason = cancelReason || '';
  if (order.paymentStatus === 'PAID') {
    order.paymentStatus = 'REFUNDED';
  }

  await order.save();

  sendSuccess(res, 200, 'Order cancelled successfully', order);
};
