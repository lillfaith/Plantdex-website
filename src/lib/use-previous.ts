'use client';

import { useState } from 'react';

/**
 * The value this component rendered with before the current one.
 *
 * Used to animate a number from where it was to where it now is. Deliberately *not*
 * implemented with a ref updated in an effect: reading a ref during render is exactly
 * what React's `react-hooks/refs` rule forbids, and it is genuinely unsafe under
 * concurrent rendering. This uses React's documented "adjust state during render"
 * pattern instead, which is allowed and re-renders immediately without a wasted commit.
 */
export function usePrevious<T>(value: T): T {
  const [current, setCurrent] = useState(value);
  const [previous, setPrevious] = useState(value);

  if (value !== current) {
    setPrevious(current);
    setCurrent(value);
  }

  return previous;
}
