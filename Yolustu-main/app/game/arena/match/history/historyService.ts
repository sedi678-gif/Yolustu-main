import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { requireFirebaseAuth } from '@/app/lib/firebaseAuth';
import { sanitizeBattleId, sanitizePlayerId } from '@/app/lib/battleEventLog/sanitizeBattleEventMeta';
import { ARENA_MATCH_COLLECTION } from '../config';
import { matchFromData } from '../matchService';
import { ARENA_HISTORY_PAGE_SIZE } from './types';
import type { ArenaHistoryCursor, ArenaHistoryPage, ArenaMatchDetails } from './types';
import { isArenaHistoryParticipant, toArenaHistoryEntry } from './view';
import { mergePublicTimeline, publicCardSummary, publicTimelineFromAudit, publicTimelineFromReaction } from './timeline';

const DETAILS_EVENT_LIMIT = 80;

function friendlyError(error: unknown, fallback: string): Error {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : '';
  if (code === 'permission-denied') return new Error('Bu döyüşə baxmaq icazən yoxdur');
  if (code === 'unavailable' || code === 'deadline-exceeded') return new Error('Şəbəkə xətası. Yenidən yoxla.');
  if (error instanceof Error && error.message && !error.message.includes('Firebase')) return error;
  return new Error(fallback);
}

export async function listArenaBattleHistory(input: {
  playerId: string;
  cursor?: ArenaHistoryCursor | null;
}): Promise<ArenaHistoryPage> {
  const playerId = sanitizePlayerId(input.playerId);
  await requireFirebaseAuth();
  try {
    const base = collection(db, ARENA_MATCH_COLLECTION);
    const clauses = [
      where('participantIds', 'array-contains', playerId),
      where('status', '==', 'closed'),
      orderBy('result.completedAt', 'desc'),
      orderBy('matchId', 'desc'),
    ];
    const q = input.cursor
      ? query(base, ...clauses, startAfter(input.cursor.completedAt, input.cursor.matchId), limit(ARENA_HISTORY_PAGE_SIZE))
      : query(base, ...clauses, limit(ARENA_HISTORY_PAGE_SIZE));
    const snap = await getDocs(q);
    const entries = snap.docs
      .map((row) => {
        const match = matchFromData(row.id, row.data() as Record<string, unknown>);
        if (match.status !== 'closed' || !match.result) return null;
        if (!isArenaHistoryParticipant(match, playerId)) return null;
        return toArenaHistoryEntry(match, playerId);
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
    const last = snap.docs[snap.docs.length - 1];
    const lastMatch = last ? matchFromData(last.id, last.data() as Record<string, unknown>) : null;
    const nextCursor =
      snap.docs.length === ARENA_HISTORY_PAGE_SIZE && lastMatch?.result
        ? { completedAt: lastMatch.result.completedAt, matchId: lastMatch.matchId }
        : null;
    return { entries, nextCursor };
  } catch (error) {
    throw friendlyError(error, 'Tarixçə yüklənmədi');
  }
}

export async function getArenaMatchDetails(input: {
  matchId: string;
  playerId: string;
  resultId?: string;
}): Promise<ArenaMatchDetails> {
  let matchId = '';
  try {
    matchId = sanitizeBattleId(input.matchId);
  } catch {
    throw new Error('Match tapılmadı');
  }
  const playerId = sanitizePlayerId(input.playerId);
  await requireFirebaseAuth();
  try {
    const snap = await getDoc(doc(db, ARENA_MATCH_COLLECTION, matchId));
    if (!snap.exists()) throw new Error('Match tapılmadı');
    const match = matchFromData(snap.id, snap.data() as Record<string, unknown>);
    if (!isArenaHistoryParticipant(match, playerId)) {
      throw new Error('Bu döyüşə baxmaq icazən yoxdur');
    }
    if (match.status === 'active' || !match.result) {
      return { kind: 'active', matchId: match.matchId };
    }
    if (input.resultId && input.resultId !== match.result.resultId) {
      throw new Error('Nəticə tapılmadı');
    }
    const entry = toArenaHistoryEntry(match, playerId);
    if (!entry) throw new Error('Nəticə tapılmadı');
    const auditSnap = await getDocs(
      query(
        collection(db, ARENA_MATCH_COLLECTION, matchId, 'audit'),
        orderBy('timestamp', 'asc'),
        limit(DETAILS_EVENT_LIMIT)
      )
    );
    const reactionSnap = await getDocs(
      query(
        collection(db, ARENA_MATCH_COLLECTION, matchId, 'reaction_events'),
        orderBy('timestamp', 'asc'),
        limit(DETAILS_EVENT_LIMIT)
      )
    );
    const timeline = mergePublicTimeline(
      publicTimelineFromAudit(auditSnap.docs.map((row) => ({ id: row.id, data: row.data() as Record<string, unknown> }))),
      publicTimelineFromReaction(
        reactionSnap.docs.map((row) => ({ id: row.id, data: row.data() as Record<string, unknown> }))
      )
    );
    return {
      kind: 'completed',
      matchId: match.matchId,
      result: match.result,
      entry,
      timeline,
      cardSummary: publicCardSummary(timeline),
    };
  } catch (error) {
    throw friendlyError(error, 'Döyüş detalları yüklənmədi');
  }
}
