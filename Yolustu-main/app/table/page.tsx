import type { Metadata } from 'next';
import GameTableCanvas from '@/app/components/gameTable/GameTableCanvas';

export const metadata: Metadata = {
  title: 'Oyun masası — Yol Üstü',
};

export default function GameTablePage() {
  return <GameTableCanvas />;
}
