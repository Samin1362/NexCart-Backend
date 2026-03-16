import { Response } from 'express';
import { ApiResponse, PaginationMeta } from '../types';

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
  meta?: PaginationMeta
): void => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    meta,
  };
  res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  errorDetails?: string
): void => {
  const response: ApiResponse = {
    success: false,
    message,
    errorDetails,
  };
  res.status(statusCode).json(response);
};
