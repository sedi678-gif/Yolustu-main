import type { Metadata } from 'next';
import BattleArena from '@/app/components/BattleArena';

export const metadata: Metadata = {
  title: 'Battle Arena — Yol Üstü',
};

export default function GameTablePage() {
  return <BattleArena gameMode="1v1" hasLiveClicker={false} currentUserRole="MEMBER" />;
}
