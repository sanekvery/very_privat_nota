/**
 * Promo Module
 * Exports all promo code-related functionality
 */

// Service
export { promoService } from './promo.service';

// Types
export type {
  PromoCodeWithRelations,
  PromoActivationWithRelations,
  CreatePromoCodeInput,
  UpdatePromoCodeInput,
  ActivatePromoCodeInput,
  PromoCodeListQuery,
  PaginatedPromoCodesResponse,
  PromoCodeStatistics,
  PromoCodeValidationResult,
} from './promo.types';

// Validation Schemas
export {
  createPromoCodeSchema,
  updatePromoCodeSchema,
  getPromoCodeByIdSchema,
  getPromoCodeByCodeSchema,
  deletePromoCodeSchema,
  activatePromoCodeSchema,
  validatePromoCodeSchema,
  listPromoCodesSchema,
  listPromoActivationsSchema,
} from './promo.validation';
