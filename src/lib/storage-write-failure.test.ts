import { describe, expect, it } from 'vitest';
import { classifyWriteError } from './storage-write-failure';
import { REFUSAL_COPY, refusalKind } from './collection-refusal';

describe('classifyWriteError', () => {
  it('treats the receipt and ordering refusals as permanent', () => {
    expect(classifyWriteError({ code: '42501', message: 'discovery_requires_capture_receipt' })).toEqual({
      permanent: true,
      reason: 'discovery_requires_capture_receipt',
    });
    expect(classifyWriteError({ code: '42501', message: 'discovery_required_first' })).toEqual({
      permanent: true,
      reason: 'discovery_required_first',
    });
    expect(classifyWriteError({ code: '23514', message: 'collection_limit_reached' }).permanent).toBe(true);
  });
  it('treats any bare 42501 as permanent', () => {
    expect(classifyWriteError({ code: '42501', message: 'new row violates row-level security' })).toEqual({
      permanent: true,
      reason: '42501',
    });
  });
  it('treats network and server errors as transient', () => {
    expect(classifyWriteError({ message: 'TypeError: Failed to fetch' }).permanent).toBe(false);
    expect(classifyWriteError({ code: '500', message: 'Internal Server Error' }).permanent).toBe(false);
    expect(classifyWriteError({ code: '57014', message: 'canceling statement due to timeout' }).permanent).toBe(false);
    expect(classifyWriteError(null).permanent).toBe(false);
  });
});

describe('refusal copy', () => {
  it('maps reasons to kinds and never offers a retry for needs-capture', () => {
    expect(refusalKind('discoveries', 'discovery_requires_capture_receipt')).toBe('needs-capture');
    expect(refusalKind('discoveries', '42501')).toBe('needs-capture');
    expect(refusalKind('learned', 'discovery_required_first')).toBe('needs-discovery');
    expect(refusalKind('discoveries', 'collection_limit_reached')).toBe('other');
    expect(REFUSAL_COPY['needs-capture']).toMatch(/in-app camera/);
    expect(REFUSAL_COPY['needs-capture']).toMatch(/Nothing was saved/);
    expect(REFUSAL_COPY['needs-capture'].toLowerCase()).not.toMatch(/retry|try again/);
  });
});
