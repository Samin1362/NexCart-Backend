import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import config from '../config';
import admin from '../config/firebase-admin';
import User from '../models/user.model';
import { sendSuccess } from '../utils/response';
import { BadRequestError, ConflictError, UnauthorizedError } from '../utils/errors';

const generateAccessToken = (userId: string, role: string): string => {
  return jwt.sign({ userId, role }, config.jwt_secret as string, {
    expiresIn: config.jwt_expires_in,
  } as jwt.SignOptions);
};

const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId }, config.jwt_secret as string, {
    expiresIn: config.jwt_refresh_expires_in,
  } as jwt.SignOptions);
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new BadRequestError('Name, email and password are required');
  }

  if (password.length < 6) {
    throw new BadRequestError('Password must be at least 6 characters');
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ConflictError('Email already registered');
  }

  const user = await User.create({ name, email, password });

  const accessToken = generateAccessToken(user._id.toString(), user.role);
  const refreshToken = generateRefreshToken(user._id.toString());

  user.refreshToken = await bcrypt.hash(refreshToken, 12);
  await user.save();

  sendSuccess(res, 201, 'Registration successful', {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      address: user.address,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    accessToken,
    refreshToken,
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new BadRequestError('Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (user.isBlocked) {
    throw new UnauthorizedError('Your account has been blocked');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const accessToken = generateAccessToken(user._id.toString(), user.role);
  const refreshToken = generateRefreshToken(user._id.toString());

  user.refreshToken = await bcrypt.hash(refreshToken, 12);
  await user.save();

  sendSuccess(res, 200, 'Login successful', {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      address: user.address,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    accessToken,
    refreshToken,
  });
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;

  if (!token) {
    throw new BadRequestError('Refresh token is required');
  }

  let decoded: { userId: string };
  try {
    decoded = jwt.verify(token, config.jwt_secret as string) as { userId: string };
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.userId).select('+refreshToken');

  if (!user || !user.refreshToken) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const isTokenValid = await bcrypt.compare(token, user.refreshToken);
  if (!isTokenValid) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const newAccessToken = generateAccessToken(user._id.toString(), user.role);

  sendSuccess(res, 200, 'Token refreshed successfully', {
    accessToken: newAccessToken,
  });
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new BadRequestError('Current password and new password are required');
  }

  if (newPassword.length < 6) {
    throw new BadRequestError('New password must be at least 6 characters');
  }

  const user = await User.findById(req.user!._id).select('+password');
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  sendSuccess(res, 200, 'Password changed successfully');
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  await User.findByIdAndUpdate(req.user!._id, { refreshToken: '' });

  sendSuccess(res, 200, 'Logout successful');
};

export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  const { idToken } = req.body;

  if (!idToken) {
    throw new BadRequestError('Firebase ID token is required');
  }

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired Firebase token');
  }

  const { uid, email, name, picture } = decoded;

  if (!email) {
    throw new BadRequestError('Google account must have an email address');
  }

  let user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    // New user — create from Google profile
    user = await User.create({
      name: name || email.split('@')[0],
      email: email.toLowerCase(),
      googleId: uid,
      avatar: picture || '',
    });
  } else {
    // Existing user — link Google account and sync avatar
    let changed = false;
    if (!user.googleId) { user.googleId = uid; changed = true; }
    if (picture && !user.avatar) { user.avatar = picture; changed = true; }
    if (changed) await user.save();
  }

  if (user.isBlocked) {
    throw new UnauthorizedError('Your account has been blocked');
  }

  const accessToken = generateAccessToken(user._id.toString(), user.role);
  const refreshToken = generateRefreshToken(user._id.toString());

  user.refreshToken = await bcrypt.hash(refreshToken, 12);
  await user.save();

  sendSuccess(res, 200, 'Google login successful', {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      address: user.address,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    accessToken,
    refreshToken,
  });
};
