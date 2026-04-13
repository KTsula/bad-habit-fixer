import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWebcam, type WebcamStatus } from '../../src/hooks/useWebcam';

/**
 * Regression net for the DOMException → WebcamStatus classifier inside
 * useWebcam. The function itself is not exported, so we drive it by
 * mocking navigator.mediaDevices.getUserMedia to reject with specific
 * DOMException names and asserting the hook's reported status.
 *
 * Covers the three distinct status kinds referenced in design.md §8
 * microcopy (denied / busy / unavailable) — each maps to a different
 * user-facing string, so misclassification shows a wrong error message.
 */

type MediaDevicesStub = {
  getUserMedia: ReturnType<typeof vi.fn>;
};

function installGetUserMediaStub(impl: () => Promise<MediaStream>): MediaDevicesStub {
  const stub: MediaDevicesStub = {
    getUserMedia: vi.fn(impl),
  };
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    value: stub,
    configurable: true,
    writable: true,
  });
  return stub;
}

function removeMediaDevices(): void {
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    value: undefined,
    configurable: true,
    writable: true,
  });
}

/** Wait for the hook to land on a terminal (non-requesting) status. */
async function waitForStatus(
  result: { current: { status: WebcamStatus } },
  ...targets: WebcamStatus[]
): Promise<WebcamStatus> {
  await waitFor(() => {
    expect(targets).toContain(result.current.status);
  });
  return result.current.status;
}

describe('useWebcam error classifier', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    removeMediaDevices();
  });

  it('classifies NotAllowedError as "denied"', async () => {
    installGetUserMediaStub(() =>
      Promise.reject(new DOMException('user refused', 'NotAllowedError'))
    );
    const { result } = renderHook(() => useWebcam());
    await waitForStatus(result, 'denied');
    expect(result.current.status).toBe('denied');
  });

  it('classifies PermissionDeniedError (legacy Safari) as "denied"', async () => {
    installGetUserMediaStub(() =>
      Promise.reject(new DOMException('legacy', 'PermissionDeniedError'))
    );
    const { result } = renderHook(() => useWebcam());
    await waitForStatus(result, 'denied');
    expect(result.current.status).toBe('denied');
  });

  it('classifies NotReadableError as "busy"', async () => {
    installGetUserMediaStub(() =>
      Promise.reject(new DOMException('hardware busy', 'NotReadableError'))
    );
    const { result } = renderHook(() => useWebcam());
    await waitForStatus(result, 'busy');
    expect(result.current.status).toBe('busy');
  });

  it('classifies TrackStartError as "busy"', async () => {
    installGetUserMediaStub(() =>
      Promise.reject(new DOMException('track failed', 'TrackStartError'))
    );
    const { result } = renderHook(() => useWebcam());
    await waitForStatus(result, 'busy');
    expect(result.current.status).toBe('busy');
  });

  it('classifies NotFoundError as "unavailable"', async () => {
    installGetUserMediaStub(() =>
      Promise.reject(new DOMException('no camera', 'NotFoundError'))
    );
    const { result } = renderHook(() => useWebcam());
    await waitForStatus(result, 'unavailable');
    expect(result.current.status).toBe('unavailable');
  });

  it('classifies OverconstrainedError as "unavailable"', async () => {
    installGetUserMediaStub(() =>
      Promise.reject(new DOMException('bad constraints', 'OverconstrainedError'))
    );
    const { result } = renderHook(() => useWebcam());
    await waitForStatus(result, 'unavailable');
    expect(result.current.status).toBe('unavailable');
  });

  it('classifies an unknown DOMException name as "unavailable"', async () => {
    installGetUserMediaStub(() =>
      Promise.reject(new DOMException('who knows', 'SomeFutureError'))
    );
    const { result } = renderHook(() => useWebcam());
    await waitForStatus(result, 'unavailable');
    expect(result.current.status).toBe('unavailable');
  });

  it('classifies a non-DOMException rejection as "unavailable"', async () => {
    installGetUserMediaStub(() => Promise.reject(new Error('plain error')));
    const { result } = renderHook(() => useWebcam());
    await waitForStatus(result, 'unavailable');
    expect(result.current.status).toBe('unavailable');
  });

  it('reports "unavailable" when mediaDevices API is missing entirely', async () => {
    removeMediaDevices();
    const { result } = renderHook(() => useWebcam());
    await waitForStatus(result, 'unavailable');
    expect(result.current.status).toBe('unavailable');
  });
});
