/**
 * News Module Validation
 * Zod schemas for news operations
 */

import { z } from 'zod';

// UUID schema
const uuidSchema = z.string().uuid();

// Create news schema
export const createNewsSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be at most 200 characters'),
  titleEn: z.string().max(200, 'English title must be at most 200 characters').optional(),
  content: z.string().min(1, 'Content is required'),
  contentEn: z.string().optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  isPublished: z.boolean().optional().default(false),
  publishedAt: z.coerce.date().optional(),
  createdBy: uuidSchema,
});

// Update news schema
export const updateNewsSchema = z.object({
  newsId: uuidSchema,
  title: z.string().min(1).max(200).optional(),
  titleEn: z.string().max(200).optional(),
  content: z.string().min(1).optional(),
  contentEn: z.string().optional(),
  imageUrl: z.string().url('Invalid image URL').optional().nullable(),
  isPublished: z.boolean().optional(),
  publishedAt: z.coerce.date().optional().nullable(),
});

// Get news by ID schema
export const getNewsByIdSchema = z.object({
  newsId: uuidSchema,
});

// Delete news schema
export const deleteNewsSchema = z.object({
  newsId: uuidSchema,
});

// List news schema (public)
export const listNewsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['publishedAt', 'createdAt']).default('publishedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// List news schema (admin)
export const listNewsAdminSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isPublished: z.coerce.boolean().optional(),
  createdBy: uuidSchema.optional(),
  sortBy: z.enum(['publishedAt', 'createdAt', 'updatedAt']).default('updatedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// Publish news schema
export const publishNewsSchema = z.object({
  newsId: uuidSchema,
  publishedAt: z.coerce.date().optional(),
});

// Unpublish news schema
export const unpublishNewsSchema = z.object({
  newsId: uuidSchema,
});
