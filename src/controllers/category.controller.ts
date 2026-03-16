import { Request, Response } from 'express';
import Category from '../models/category.model';
import { sendSuccess } from '../utils/response';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors';
import { generateSlug } from '../utils/helpers';

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  const { name, description, image } = req.body;

  if (!name) {
    throw new BadRequestError('Category name is required');
  }

  const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (existing) {
    throw new ConflictError('Category with this name already exists');
  }

  let slug = generateSlug(name);

  const slugExists = await Category.findOne({ slug });
  if (slugExists) {
    slug = `${slug}-${Date.now()}`;
  }

  const category = await Category.create({ name, slug, description, image });

  sendSuccess(res, 201, 'Category created successfully', category);
};

export const getAllCategories = async (_req: Request, res: Response): Promise<void> => {
  const categories = await Category.find().sort({ name: 1 });

  sendSuccess(res, 200, 'Categories fetched successfully', categories);
};

export const getCategoryBySlug = async (req: Request, res: Response): Promise<void> => {
  const category = await Category.findOne({ slug: req.params.slug });

  if (!category) {
    throw new NotFoundError('Category not found');
  }

  sendSuccess(res, 200, 'Category fetched successfully', category);
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  const { name, description, image } = req.body;

  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new NotFoundError('Category not found');
  }

  if (name && name !== category.name) {
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: category._id },
    });
    if (existing) {
      throw new ConflictError('Category with this name already exists');
    }
    category.name = name;
    category.slug = generateSlug(name);
  }

  if (description !== undefined) category.description = description;
  if (image !== undefined) category.image = image;

  await category.save();

  sendSuccess(res, 200, 'Category updated successfully', category);
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    throw new NotFoundError('Category not found');
  }

  if (category.productCount > 0) {
    throw new BadRequestError(`Cannot delete category with ${category.productCount} product(s). Remove products first.`);
  }

  await Category.findByIdAndDelete(req.params.id);

  sendSuccess(res, 200, 'Category deleted successfully');
};
