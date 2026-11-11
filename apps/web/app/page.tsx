'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '../lib/api';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">
      Loading AI Website Auditor...
    </div>
  );
}
