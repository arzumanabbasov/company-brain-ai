'use client';

import { useRouter } from 'next/navigation';
import ChatInterface from '@/components/ChatInterface';

export default function Chat() {
  const router = useRouter();

  const handleNavigate = (page: string) => {
    router.push(`/${page}`);
  };

  return <ChatInterface onNavigate={handleNavigate} />;
}