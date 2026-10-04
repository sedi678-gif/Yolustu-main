export type ArenaRewardStatus = 'PENDING' | 'SECURITY_CHECK' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type ArenaRewardSecurityStatus = 'CLEAR' | 'BLOCKED';
export type ArenaRewardRecipientType = 'USER' | 'ALLIANCE';
export type ArenaRewardSourceType = 'ARENA_MATCH' | 'WEEKLY_RANKING';
export type ArenaRewardType = 'BATTLE_COMPLETION' | 'WEEKLY_RANKING';
export type ArenaRewardCurrency = 'AZN';

export type ArenaRewardRecord = {
  rewardId: string;
  periodId: string;
  sourceType: ArenaRewardSourceType;
  sourceId: string;
  matchId: string;
  rewardType: ArenaRewardType;
  recipientType: ArenaRewardRecipientType;
  recipientId: string;
  countryCode: string;
  rank: number | null;
  amount: number | null;
  currency: ArenaRewardCurrency;
  status: ArenaRewardStatus;
  createdAt: number;
  approvedAt: number | null;
  rejectedAt: number | null;
  securityStatus: ArenaRewardSecurityStatus;
  viewerIds: string[];
};

export type ArenaRewardPublic = {
  rewardId: string;
  periodId: string;
  sourceId: string;
  recipientType: ArenaRewardRecipientType;
  recipientId: string;
  countryCode: string;
  rank: number | null;
  amount: number | null;
  currency: ArenaRewardCurrency;
  status: ArenaRewardStatus;
  createdAt: number;
  approvedAt: number | null;
};

export type ArenaRewardEventType =
  | 'REWARD_ELIGIBILITY_CHECKED'
  | 'REWARD_CREATED'
  | 'REWARD_SECURITY_CHECKED'
  | 'REWARD_APPROVED'
  | 'REWARD_REJECTED'
  | 'REWARD_ALLOCATION_STARTED'
  | 'REWARD_ALLOCATION_CREATED'
  | 'REWARD_ALLOCATION_COMPLETED';

export type ArenaRewardPlan = {
  rewardId: string;
  periodId: string;
  recipientType: ArenaRewardRecipientType;
  recipientId: string;
  viewerIds: string[];
  matchId: string;
  sourceId: string;
  sourceType: ArenaRewardSourceType;
  rewardType: ArenaRewardType;
  countryCode: string;
  rank: number | null;
  amount: number | null;
};

export type ArenaRewardAllocationEntry = {
  countryCode: string;
  recipientType: ArenaRewardRecipientType;
  rank: number;
  amount: number;
  currency: ArenaRewardCurrency;
};

export type ArenaRewardAllocationTable = {
  entries: ArenaRewardAllocationEntry[];
};

export type ArenaRewardSettlementStatus = 'skipped' | 'completed';

export type ArenaRewardSettlementReceipt = {
  settlementId: string;
  periodId: string;
  countryCode: string;
  status: 'completed';
  allocatedCount: number;
  createdAt: number;
};
