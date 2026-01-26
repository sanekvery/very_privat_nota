/**
 * REFERRALS Module Exports
 */

// Services
export { referralService } from './referral.service';

// Types
export type {
  ReferralBalance,
  ReferralStatistics,
  TopReferral,
  ReferralTransactionWithRelations,
  WithdrawalRequestWithRelations,
  CreateWithdrawalInput,
  WithdrawalStatus,
  ReferralSettings,
  ReferralHistoryQuery,
  ReferralEarningsSummary,
  AdminReferralStatistics,
} from './referrals.types';

// Validation schemas
export {
  getReferralBalanceSchema,
  getReferralStatisticsSchema,
  getReferralHistorySchema,
  createWithdrawalSchema,
  updateWithdrawalStatusSchema,
  getWithdrawalSchema,
  listWithdrawalsSchema,
  updateReferralSettingsSchema,
  referralCodeSchema,
} from './referrals.validation';

export type {
  ReferralHistoryInput,
  CreateWithdrawalInput as CreateWithdrawalInputValidated,
  UpdateWithdrawalStatusInput,
  ListWithdrawalsInput,
  UpdateReferralSettingsInput,
} from './referrals.validation';
