'use client';

import { useRouter } from 'next/navigation';
import { ReactNode, useRef } from 'react';

export default function FilterForm({ children }: { children: ReactNode }) {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (e: React.FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget;
    const formData = new FormData(form);
    const params = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      if (value && typeof value === 'string') {
        params.set(key, value);
      }
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the router push to prevent lagging on rapid typing
    timeoutRef.current = setTimeout(() => {
      router.push(`/?${params.toString()}`, { scroll: false });
    }, 300);
  };

  return (
    <form onChange={handleChange} className="space-y-4 w-full flex flex-col items-center">
      {children}
    </form>
  );
}
