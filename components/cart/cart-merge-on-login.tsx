'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

/** Merges guest cart into user cart after any login (credentials or OAuth) */
export function CartMergeOnLogin() {
  const { status } = useSession();
  const mergedRef = useRef(false);

  useEffect(() => {
    if (status === 'authenticated' && !mergedRef.current) {
      mergedRef.current = true;
      fetch('/api/cart/merge', { method: 'POST' }).catch(() => {});
    }
    if (status === 'unauthenticated') {
      mergedRef.current = false;
    }
  }, [status]);

  return null;
}
