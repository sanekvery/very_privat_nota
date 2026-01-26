/**
 * Admin Module
 * Exports all admin-related functionality
 */

// Service
export { adminService } from './admin.service';

// Types
export type {
  AdminAuditLog,
  SystemSettings,
  CreateAuditLogInput,
  AuditLogListQuery,
  PaginatedAuditLogResponse,
  CreateSystemSettingInput,
  UpdateSystemSettingInput,
  PaginatedSystemSettingsResponse,
  DashboardStatistics,
} from './admin.types';

export { AuditAction, EntityType } from './admin.types';

// Validation Schemas
export {
  createAuditLogSchema,
  listAuditLogSchema,
  createSystemSettingSchema,
  updateSystemSettingSchema,
  getSystemSettingSchema,
  deleteSystemSettingSchema,
  listSystemSettingsSchema,
} from './admin.validation';
