import { Request, Response } from 'express';
import Product from '../models/product.model';
import Category from '../models/category.model';
import { sendSuccess } from '../utils/response';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { generateSlug } from '../utils/helpers';

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  const { title, description, price, discountPrice, images, category, brand, stock, tags, specifications, isFeatured } = req.body;

  if (!images || images.length === 0) {
    throw new BadRequestError('At least one image is required');
  }

  if (discountPrice !== undefined && discountPrice >= price) {
    throw new BadRequestError('Discount price must be less than the original price');
  }

  const categoryDoc = await Category.findById(category);
  if (!categoryDoc) {
    throw new NotFoundError('Category not found');
  }

  let slug = generateSlug(title);
  const slugExists = await Product.findOne({ slug });
  if (slugExists) {
    slug = `${slug}-${Date.now()}`;
  }

  const product = await Product.create({
    title,
    slug,
    description,
    price,
    discountPrice,
    images,
    category,
    brand,
    stock,
    tags,
    specifications,
    isFeatured,
    createdBy: req.user!._id,
  });

  await Category.findByIdAndUpdate(category, { $inc: { productCount: 1 } });

  sendSuccess(res, 201, 'Product created successfully', product);
};

export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const search = req.query.search as string;
  const categorySlug = req.query.category as string;
  const priceMin = parseFloat(req.query.priceMin as string);
  const priceMax = parseFloat(req.query.priceMax as string);
  const rating = parseFloat(req.query.rating as string);
  const brand = req.query.brand as string;
  const discounted = req.query.discounted as string;
  const sortParam = (req.query.sort as string) || '-createdAt';

  const filter: Record<string, unknown> = { isActive: true };

  if (search) {
    filter.$text = { $search: search };
  }

  if (categorySlug) {
    const categoryDoc = await Category.findOne({ slug: categorySlug });
    if (categoryDoc) {
      filter.category = categoryDoc._id;
    }
  }

  if (!isNaN(priceMin) || !isNaN(priceMax)) {
    const priceFilter: Record<string, number> = {};
    if (!isNaN(priceMin)) priceFilter.$gte = priceMin;
    if (!isNaN(priceMax)) priceFilter.$lte = priceMax;
    filter.price = priceFilter;
  }

  if (!isNaN(rating)) {
    filter.rating = { $gte: rating };
  }

  if (brand) {
    filter.brand = { $regex: brand, $options: 'i' };
  }

  if (discounted === 'true') {
    filter.discountPrice = { $gt: 0 };
  }

  const stockLt = parseFloat(req.query.stock_lt as string);
  if (!isNaN(stockLt)) {
    filter.stock = { $lt: stockLt };
  }

  const sortObj: Record<string, 1 | -1> = {};
  if (sortParam.startsWith('-')) {
    sortObj[sortParam.substring(1)] = -1;
  } else {
    sortObj[sortParam] = 1;
  }

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .sort(sortObj)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  sendSuccess(res, 200, 'Products fetched successfully', products, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
};

export const getFeaturedProducts = async (_req: Request, res: Response): Promise<void> => {
  const products = await Product.find({ isFeatured: true, isActive: true })
    .populate('category', 'name slug')
    .sort({ createdAt: -1 })
    .limit(8);

  sendSuccess(res, 200, 'Featured products fetched successfully', products);
};

export const getProductBySlug = async (req: Request, res: Response): Promise<void> => {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true })
    .populate('category', 'name slug')
    .populate('createdBy', 'name');

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  sendSuccess(res, 200, 'Product fetched successfully', product);
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  const { title, description, price, discountPrice, images, category, brand, stock, tags, specifications, isFeatured } = req.body;

  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  const effectivePrice = price !== undefined ? price : product.price;
  if (discountPrice !== undefined && discountPrice >= effectivePrice) {
    throw new BadRequestError('Discount price must be less than the original price');
  }

  if (category && category.toString() !== product.category.toString()) {
    const newCategory = await Category.findById(category);
    if (!newCategory) {
      throw new NotFoundError('Category not found');
    }
    await Category.findByIdAndUpdate(product.category, { $inc: { productCount: -1 } });
    await Category.findByIdAndUpdate(category, { $inc: { productCount: 1 } });
    product.category = category;
  }

  if (title !== undefined && title !== product.title) {
    product.title = title;
    let slug = generateSlug(title);
    const slugExists = await Product.findOne({ slug, _id: { $ne: product._id } });
    if (slugExists) {
      slug = `${slug}-${Date.now()}`;
    }
    product.slug = slug;
  }

  if (description !== undefined) product.description = description;
  if (price !== undefined) product.price = price;
  if (discountPrice !== undefined) product.discountPrice = discountPrice;
  if (images !== undefined) product.images = images;
  if (brand !== undefined) product.brand = brand;
  if (stock !== undefined) product.stock = stock;
  if (tags !== undefined) product.tags = tags;
  if (specifications !== undefined) product.specifications = specifications;
  if (isFeatured !== undefined) product.isFeatured = isFeatured;

  await product.save();

  sendSuccess(res, 200, 'Product updated successfully', product);
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  if (product.isActive) {
    product.isActive = false;
    await product.save();
    await Category.findByIdAndUpdate(product.category, { $inc: { productCount: -1 } });
  }

  sendSuccess(res, 200, 'Product deleted successfully');
};
