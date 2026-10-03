import type { Metadata } from 'next';
import GameArenaScreen from '@/app/components/gameArena/GameArenaScreen';

export const metadata: Metadata = {
  title: 'Oyun masası — Yol Üstü',
};

export default function GameTablePage() {
  return <GameArenaScreen />;
}
