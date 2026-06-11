'use client';
import { useLoader } from '@/context/loader-context';
import { Loader2 } from 'lucide-react';

export default function SiteLoader() {
  const { isLoading } = useLoader();

  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[999]">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
    </div>
  );
}
