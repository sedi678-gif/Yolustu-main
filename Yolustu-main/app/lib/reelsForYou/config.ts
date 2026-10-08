export const REEL_SIGNAL_EVENTS_COLLECTION = 'reel_signal_events';
export const USER_PROFILE_SCORES_COLLECTION = 'user_profile_scores';
export const REEL_SIGNAL_SCHEMA_VERSION = 1 as const;

/** 3 saniyədən az baxış = skip. */
export const REEL_SKIP_WATCH_SECONDS = 3;

export const REEL_MAX_WATCH_SECONDS = 3600;
export const REEL_COMPLETE_WATCH_PERCENT = 80;
export const REEL_MAX_HASHTAGS = 8;
export const REEL_HASHTAG_MAX_LEN = 24;
export const REEL_CATEGORY_MAX_LEN = 32;
export const REEL_SCORE_MIN = -1000;
export const REEL_SCORE_MAX = 10_000;

/** Rəsmi çəkilər — müştəri göndərə bilməz. */
export const REEL_SIGNAL_WEIGHTS = {
  skipCategory: -2,
  skipHashtag: -1,
  watchCategoryPerPercent: 0.02,
  watchHashtagPerPercent: 0.01,
  completeCategory: 3,
  completeHashtag: 1.5,
  likeCategory: 8,
  likeHashtag: 4,
  commentCategory: 10,
  commentHashtag: 5,
  shareCategory: 12,
  shareHashtag: 6,
} as const;
