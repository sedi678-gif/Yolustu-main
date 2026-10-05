import type { Metadata } from 'next';
import ShopPageClient from '@/app/components/shop/ShopPageClient';

export const metadata: Metadata = {
  title: 'Mağaza — Yol Üstü',
};

export default function ShopPage() {
  return <ShopPageClient />;
}
