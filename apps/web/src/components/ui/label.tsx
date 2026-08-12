'use client';

import * as LabelPrimitive from '@radix-ui/react-label';
import { type ComponentPropsWithoutRef, forwardRef, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export const Label = forwardRef<
  HTMLLabelElement,
  ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(function Label({ className, ...props }, ref): ReactNode {
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    />
  );
});
