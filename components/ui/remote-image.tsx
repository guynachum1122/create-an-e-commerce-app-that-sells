'use client';

import { cn } from '@/lib/utils';

type RemoteImageProps = {
  src: string;
  alt?: string;
  fill?: boolean;
  className?: string;
  priority?: boolean;
};

/** Load external product photos directly — avoids Vercel / Next image optimizer 400s. */
export function RemoteImage({ src, alt = '', fill, className, priority }: RemoteImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={cn(fill && 'absolute inset-0 h-full w-full', className)}
    />
  );
}
