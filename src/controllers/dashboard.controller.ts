import { Request, Response } from 'express';
import User from '../models/user.model';
import Product from '../models/product.model';
import Order from '../models/order.model';
import Category from '../models/category.model';
import { sendSuccess } from '../utils/response';

export const getStats = async (_req: Request, res: Response): Promise<void> => {
  const [totalUsers, totalProducts, totalOrders, pendingOrders, deliveredOrders, revenueResult] =
    await Promise.all([
      User.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Order.countDocuments({ orderStatus: 'PENDING' }),
      Order.countDocuments({ orderStatus: 'DELIVERED' }),
      Order.aggregate([
        { $match: { paymentStatus: 'PAID' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
    ]);

  const totalRevenue = revenueResult.length > 0
    ? Math.round(revenueResult[0].total * 100) / 100
    : 0;

  sendSuccess(res, 200, 'Dashboard stats fetched successfully', {
    totalUsers,
    totalProducts,
    totalOrders,
    totalRevenue,
    pendingOrders,
    deliveredOrders,
  });
};

export const getChartData = async (_req: Request, res: Response): Promise<void> => {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const [revenueByMonth, ordersByStatus, topCategories] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          paymentStatus: 'PAID',
          createdAt: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$totalAmount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),

    Order.aggregate([
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    Order.aggregate([
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'categories',
          localField: 'product.category',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $group: {
          _id: '$category.name',
          count: { $sum: '$items.quantity' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const formattedRevenue = revenueByMonth.map((item) => ({
    month: monthNames[item._id.month - 1],
    year: item._id.year,
    revenue: Math.round(item.revenue * 100) / 100,
  }));

  const formattedStatus = ordersByStatus.map((item) => ({
    status: item._id,
    count: item.count,
  }));

  const formattedCategories = topCategories.map((item) => ({
    category: item._id,
    count: item.count,
  }));

  sendSuccess(res, 200, 'Chart data fetched successfully', {
    revenueByMonth: formattedRevenue,
    ordersByStatus: formattedStatus,
    topCategories: formattedCategories,
  });
};

export const getRecentOrders = async (_req: Request, res: Response): Promise<void> => {
  const orders = await Order.find()
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .limit(10);

  sendSuccess(res, 200, 'Recent orders fetched successfully', orders);
};

export const getTopProducts = async (_req: Request, res: Response): Promise<void> => {
  const topProducts = await Order.aggregate([
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        title: { $first: '$items.title' },
        image: { $first: '$items.image' },
        totalQty: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      },
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: 5 },
  ]);

  const formatted = topProducts.map((p) => ({
    productId: p._id,
    title: p.title,
    image: p.image,
    totalQty: p.totalQty,
    totalRevenue: Math.round(p.totalRevenue * 100) / 100,
  }));

  sendSuccess(res, 200, 'Top products fetched successfully', formatted);
};
