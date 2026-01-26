/**
 * Payments Module
 * Exports all payment-related services, types, and validators
 */

// Services
export { paymentService, PaymentService } from './payment.service';
export { promoCodeService, PromoCodeService } from './promo-code.service';
export { tonService, TonService } from './ton.service';

// Types
export type {
  PaymentStatus,
  PaymentMethod,
  PaymentWithRelations,
  CreatePaymentInput,
  UpdatePaymentStatusInput,
  TonPaymentVerification,
  TonWebhookPayload,
  PromoCodeWithRelations,
  CreatePromoCodeInput,
  ActivatePromoCodeInput,
  PromoCodeValidation,
  PaymentStats,
  UserPaymentHistory,
  TonWalletConfig,
  TonTransaction,
  RefundRequest,
} from './payments.types';

// Validation schemas
export {
  paymentStatusSchema,
  paymentMethodSchema,
  createPaymentSchema,
  updatePaymentStatusSchema,
  getPaymentSchema,
  listPaymentsSchema,
  tonWebhookSchema,
  createPromoCodeSchema,
  activatePromoCodeSchema,
  updatePromoCodeSchema,
  getPromoCodeSchema,
  validatePromoCodeSchema,
  refundPaymentSchema,
} from './payments.validation';

export type {
  CreatePaymentInput as CreatePaymentDTO,
  UpdatePaymentStatusInput as UpdatePaymentStatusDTO,
  TonWebhookPayload as TonWebhookDTO,
  CreatePromoCodeInput as CreatePromoCodeDTO,
  ActivatePromoCodeInput as ActivatePromoCodeDTO,
  UpdatePromoCodeInput as UpdatePromoCodeDTO,
  RefundRequest as RefundRequestDTO,
} from './payments.validation';
