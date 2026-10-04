import { officialWeekKey, isPeriodKey } from '@/app/lib/leaderboard/leaderboardConfig';
import { assertRewardOnce } from '@/app/lib/battleSecurity/battleSecurityPolicy';
import { ARENA_REWARD_ALLOCATION, ARENA_REWARD_COUNTRY_CODE, ARENA_REWARD_TYPE } from './config';
import type { ArenaMatchState } from '../types';
import type { ArenaRewardPlan, ArenaRewardPublic, ArenaRewardRecord, ArenaRewardSecurityStatus, ArenaRewardStatus } from './types';

const ISO_COUNTRY = /^[A-Z]{2}$/;

function clipId(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}

export function officialArenaRewardPeriodId(completedAt: number): string {
  return officialWeekKey(completedAt);
}

export function arenaRewardId(plan: Pick<ArenaRewardPlan, 'periodId' | 'sourceId' | 'recipientType' | 'recipientId'>): string {
  return clipId(
    `${plan.periodId}_${plan.sourceId}_${plan.recipientType}_${plan.recipientId}_${ARENA_REWARD_TYPE}`
  );
}

export function planArenaMatchRewards(match: ArenaMatchState): ArenaRewardPlan[] {
  const result = match.result;
  if (match.status !== 'closed' || !result || result.status !== 'COMPLETED') return [];
  const periodId = officialArenaRewardPeriodId(result.completedAt);
  if (!isPeriodKey(periodId)) return [];
  const sourceId = result.resultId;
  const viewerIds = [...new Set(match.participantIds.filter(Boolean))];
  if (result.gameMode === '1v1' && result.winnerPlayerId) {
    const recipientId = result.winnerPlayerId;
    const plan: ArenaRewardPlan = {
      periodId,
      sourceId,
      matchId: result.matchId,
      recipientType: 'USER',
      recipientId,
      viewerIds: [...new Set([...viewerIds, recipientId])],
      rewardId: '',
    };
    plan.rewardId = arenaRewardId(plan);
    return [plan];
  }
  if (result.gameMode === '5v5' && result.winnerAllianceId) {
    const recipientId = result.winnerAllianceId;
    const plan: ArenaRewardPlan = {
      periodId,
      sourceId,
      matchId: result.matchId,
      recipientType: 'ALLIANCE',
      recipientId,
      viewerIds,
      rewardId: '',
    };
    plan.rewardId = arenaRewardId(plan);
    return [plan];
  }
  return [];
}

export function assertArenaRewardEligible(match: ArenaMatchState, plan: ArenaRewardPlan): void {
  const result = match.result;
  if (match.status !== 'closed' || !result) throw new Error('REJECT');
  if (result.status !== 'COMPLETED') throw new Error('REJECT');
  if (result.resultId !== plan.sourceId) throw new Error('REJECT');
  if (result.matchId !== plan.matchId) throw new Error('REJECT');
  if (plan.periodId !== officialArenaRewardPeriodId(result.completedAt)) throw new Error('REJECT');
  if (!isPeriodKey(plan.periodId)) throw new Error('REJECT');
  if (!plan.recipientId.trim()) throw new Error('REJECT');
  if (plan.recipientType === 'USER' && result.winnerPlayerId !== plan.recipientId) throw new Error('REJECT');
  if (plan.recipientType === 'ALLIANCE' && result.winnerAllianceId !== plan.recipientId) throw new Error('REJECT');
  if (!ISO_COUNTRY.test(ARENA_REWARD_COUNTRY_CODE)) throw new Error('REJECT');
  if (ARENA_REWARD_ALLOCATION != null) throw new Error('REJECT');
  if (plan.recipientType === 'USER' && !match.participantIds.includes(plan.recipientId) && !match.homePlayerIds.includes(plan.recipientId) && !match.awayPlayerIds.includes(plan.recipientId)) {
    throw new Error('REJECT');
  }
}

export function resolveArenaRewardSecurity(blocked: boolean): {
  securityStatus: ArenaRewardSecurityStatus;
  status: Extract<ArenaRewardStatus, 'APPROVED' | 'REJECTED'>;
} {
  if (blocked) return { securityStatus: 'BLOCKED', status: 'REJECTED' };
  return { securityStatus: 'CLEAR', status: 'APPROVED' };
}

export function buildArenaRewardRecord(input: {
  plan: ArenaRewardPlan;
  createdAt: number;
  blocked: boolean;
  receiptExists: boolean;
}): ArenaRewardRecord | null {
  const once = assertRewardOnce(input.receiptExists);
  if (!once.apply) return null;
  const security = resolveArenaRewardSecurity(input.blocked);
  return {
    rewardId: input.plan.rewardId,
    periodId: input.plan.periodId,
    sourceType: 'ARENA_MATCH',
    sourceId: input.plan.sourceId,
    matchId: input.plan.matchId,
    rewardType: 'BATTLE_COMPLETION',
    recipientType: input.plan.recipientType,
    recipientId: input.plan.recipientId,
    countryCode: ARENA_REWARD_COUNTRY_CODE,
    rank: null,
    amount: null,
    currency: 'AZN',
    status: security.status,
    createdAt: input.createdAt,
    approvedAt: security.status === 'APPROVED' ? input.createdAt : null,
    rejectedAt: security.status === 'REJECTED' ? input.createdAt : null,
    securityStatus: security.securityStatus,
    viewerIds: input.plan.viewerIds,
  };
}

export function toArenaRewardPublic(record: ArenaRewardRecord): ArenaRewardPublic {
  return {
    rewardId: record.rewardId,
    periodId: record.periodId,
    sourceId: record.sourceId,
    recipientType: record.recipientType,
    recipientId: record.recipientId,
    countryCode: record.countryCode,
    rank: record.rank,
    amount: record.amount,
    currency: record.currency,
    status: record.status,
    createdAt: record.createdAt,
    approvedAt: record.approvedAt,
  };
}
