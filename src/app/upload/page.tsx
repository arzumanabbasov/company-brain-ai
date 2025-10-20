'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import UploadPage from '@/components/UploadPage';
import { UploadResponse } from '@/lib/types';

export default function Upload() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadComplete = (response: UploadResponse) => {
    if (response.success) {
      // Show success message and redirect to chat
      setTimeout(() => {
        router.push('/chat');
      }, 2000);
    }
  };

  return (
    <UploadPage onUploadComplete={handleUploadComplete} />
  );
}
