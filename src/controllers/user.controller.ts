import { Request, Response } from 'express';
import User from '../models/user.model';
import { sendSuccess } from '../utils/response';
import { BadRequestError, NotFoundError } from '../utils/errors';

export const getMe = async (req: Request, res: Response): Promise<void> => {
  const user = await User.findById(req.user!._id);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  sendSuccess(res, 200, 'Profile fetched successfully', user);
};

export const updateMe = async (req: Request, res: Response): Promise<void> => {
  const { name, phone, avatar, address } = req.body;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone;
  if (avatar !== undefined) updateData.avatar = avatar;
  if (address !== undefined) updateData.address = address;

  const user = await User.findByIdAndUpdate(req.user!._id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  sendSuccess(res, 200, 'Profile updated successfully', user);
};

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = req.query.search as string;

  const filter: Record<string, unknown> = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  sendSuccess(res, 200, 'Users fetched successfully', users, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  sendSuccess(res, 200, 'User fetched successfully', user);
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  const { role, isBlocked } = req.body;

  const updateData: Record<string, unknown> = {};
  if (role !== undefined) updateData.role = role;
  if (isBlocked !== undefined) updateData.isBlocked = isBlocked;

  const user = await User.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  sendSuccess(res, 200, 'User updated successfully', user);
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  if (req.params.id === req.user!._id) {
    throw new BadRequestError('You cannot delete your own account');
  }

  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  sendSuccess(res, 200, 'User deleted successfully');
};
