export type ArenaRewardStatus = 'PENDING' | 'SECURITY_CHECK' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type ArenaRewardSecurityStatus = 'CLEAR' | 'BLOCKED';
export type ArenaRewardRecipientType = 'USER' | 'ALLIANCE';
export type ArenaRewardSourceType = 'ARENA_MATCH';
export type ArenaRewardType = 'BATTLE_COMPLETION';
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
  | 'REWARD_REJECTED';

export type ArenaRewardPlan = {
  rewardId: string;
  periodId: string;
  recipientType: ArenaRewardRecipientType;
  recipientId: string;
  viewerIds: string[];
  matchId: string;
  sourceId: string;
};
