import { Types } from 'mongoose';

// ========================
// Express Request Extension
// ========================

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        email: string;
        role: string;
      };
    }
  }
}

// ========================
// User
// ========================

export interface IAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export type UserRole = 'USER' | 'ADMIN';

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar: string;
  googleId: string;
  phone: string;
  address: IAddress;
  isBlocked: boolean;
  refreshToken: string;
  wishlist: Types.ObjectId[] | IProduct[];
  createdAt: Date;
  updatedAt: Date;
}

// ========================
// Category
// ========================

export interface ICategory {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  image: string;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ========================
// Product
// ========================

export interface ISpecification {
  key: string;
  value: string;
}

export interface IProduct {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  price: number;
  discountPrice: number;
  images: string[];
  category: Types.ObjectId;
  brand: string;
  stock: number;
  sold: number;
  rating: number;
  reviewCount: number;
  tags: string[];
  specifications: ISpecification[];
  isFeatured: boolean;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ========================
// Review
// ========================

export interface IReview {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

// ========================
// Cart
// ========================

export interface ICartItem {
  productId: Types.ObjectId;
  quantity: number;
  price: number;
}

export interface ICart {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  items: ICartItem[];
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ========================
// Order
// ========================

export type PaymentMethod = 'COD' | 'CARD' | 'BKASH' | 'NAGAD';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface IOrderItem {
  productId: Types.ObjectId;
  title: string;
  price: number;
  quantity: number;
  image: string;
}

export interface IOrder {
  _id: Types.ObjectId;
  orderNumber: string;
  userId: Types.ObjectId;
  items: IOrderItem[];
  shippingAddress: IAddress;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  subtotal: number;
  shippingCost: number;
  tax: number;
  totalAmount: number;
  notes: string;
  cancelReason: string;
  deliveredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ========================
// API Response
// ========================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
  errorDetails?: string;
}
