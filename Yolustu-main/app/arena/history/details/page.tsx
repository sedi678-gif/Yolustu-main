import type { Metadata } from 'next';
import { Suspense } from 'react';
import ArenaMatchDetailsScreen from '@/app/game/arena/ArenaMatchDetailsScreen';

export const metadata: Metadata = {
  title: 'Döyüş detalı — Yol Üstü',
};

export default function ArenaMatchDetailsPage() {
  return (
    <Suspense fallback={<p>Yüklənir…</p>}>
      <ArenaMatchDetailsScreen />
    </Suspense>
  );
}
