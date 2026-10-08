export {
  REEL_SIGNAL_EVENTS_COLLECTION,
  USER_PROFILE_SCORES_COLLECTION,
  REEL_SIGNAL_SCHEMA_VERSION,
  REEL_SKIP_WATCH_SECONDS,
  REEL_SIGNAL_WEIGHTS,
} from './config';

export type {
  ReelSignalEvent,
  ReelSignalEventType,
  ReelSignalHandlerResult,
  ReelSignalRequestBody,
  ReelVideoMeta,
  UserProfileScores,
} from './types';

export {
  officialReelEventType,
  officialWatchPercentage,
  isReelSkipWatch,
  sanitizeReelHashtags,
} from './policy';

export { applyReelSignalToProfileScores, emptyUserProfileScores, officialScoreDelta } from './profileScores';
export { handleReelSignal } from './handleReelSignal';
export { trackReelSignal, loadReelVideoMeta } from './signalService';
