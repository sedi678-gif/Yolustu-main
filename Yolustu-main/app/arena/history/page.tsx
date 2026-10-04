import type { Metadata } from 'next';
import ArenaBattleHistoryScreen from '@/app/game/arena/ArenaBattleHistoryScreen';

export const metadata: Metadata = {
  title: 'Döyüş tarixçəsi — Yol Üstü',
};

export default function ArenaHistoryPage() {
  return <ArenaBattleHistoryScreen />;
}
