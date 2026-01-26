/**
 * Servers Module
 * Exports all server-related services, types, and validators
 */

// Services
export { serverService, ServerService } from './server.service';

// Types
export type {
  ServerStatus,
  ServerWithStats,
  CreateServerInput,
  UpdateServerInput,
  HealthCheckResult,
  ServerLoadMetrics,
  ServerSelectionCriteria,
  OptimalServerResult,
  ServerStatistics,
  ServerCapacityInfo,
} from './servers.types';

// Validation schemas
export {
  serverStatusSchema,
  createServerSchema,
  updateServerSchema,
  getServerSchema,
  listServersSchema,
  serverSelectionSchema,
  healthCheckSchema,
} from './servers.validation';

export type {
  CreateServerInput as CreateServerDTO,
  UpdateServerInput as UpdateServerDTO,
  ServerSelectionInput as ServerSelectionDTO,
} from './servers.validation';
