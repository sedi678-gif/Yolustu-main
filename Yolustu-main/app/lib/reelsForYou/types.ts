export const REEL_SIGNAL_EVENT_TYPES = ['watch', 'like', 'comment', 'share', 'skip'] as const;

export type ReelSignalEventType = (typeof REEL_SIGNAL_EVENT_TYPES)[number];

/** Müştəridən gələn xam hadisə — userId, faiz, skip və skor buradan götürülmür. */
export type ReelSignalRequestBody = {
  videoId: string;
  eventType?: ReelSignalEventType | string;
  watchDurationSeconds?: number;
  watchPercentage?: number;
  videoDurationSeconds?: number;
  categoryId?: string;
  hashtags?: string[];
  requestId?: string;
};

export type ReelVideoMeta = {
  videoId: string;
  durationSeconds: number;
  categoryId: string;
  hashtags: string[];
};

export type ReelSignalEvent = {
  id: string;
  userId: string;
  videoId: string;
  eventType: ReelSignalEventType;
  watchDurationSeconds: number;
  watchPercentage: number;
  categoryId: string;
  hashtags: string[];
  requestId: string;
  createdAt: number;
  schemaVersion: 1;
};

export type UserProfileScoreTotals = {
  watchCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  skipCount: number;
  watchDurationSeconds: number;
};

export type UserProfileScores = {
  userId: string;
  schemaVersion: 1;
  categoryScores: Record<string, number>;
  hashtagScores: Record<string, number>;
  totals: UserProfileScoreTotals;
  updatedAt: number;
};

export type ReelSignalHandlerInput = {
  authUserId: string;
  body: ReelSignalRequestBody;
  serverNow: number;
  video: ReelVideoMeta | null;
  profile: UserProfileScores | null;
  alreadyTracked: boolean;
};

export type ReelSignalHandlerOk = {
  ok: true;
  duplicate: boolean;
  event: ReelSignalEvent;
  profile: UserProfileScores;
};

export type ReelSignalHandlerErr = {
  ok: false;
  error: string;
};

export type ReelSignalHandlerResult = ReelSignalHandlerOk | ReelSignalHandlerErr;
