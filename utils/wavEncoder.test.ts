import { describe, it, expect } from 'vitest';
import { audioBufferToWav } from './wavEncoder';

// Minimal stand-in for the Web Audio AudioBuffer, which doesn't exist in Node.
function makeBuffer(channels: Float32Array[], sampleRate = 44100): AudioBuffer {
  return {
    numberOfChannels: channels.length,
    sampleRate,
    length: channels[0].length,
    getChannelData: (i: number) => channels[i],
  } as unknown as AudioBuffer;
}

async function bytes(blob: Blob): Promise<DataView> {
  return new DataView(await blob.arrayBuffer());
}

function ascii(view: DataView, offset: number, length: number): string {
  let s = '';
  for (let i = 0; i < length; i++) s += String.fromCharCode(view.getUint8(offset + i));
  return s;
}

describe('audioBufferToWav', () => {
  it('writes a valid 16-bit PCM RIFF header for mono audio', async () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1]);
    const view = await bytes(audioBufferToWav(makeBuffer([samples])));

    expect(ascii(view, 0, 4)).toBe('RIFF');
    expect(ascii(view, 8, 4)).toBe('WAVE');
    expect(ascii(view, 12, 4)).toBe('fmt ');
    expect(ascii(view, 36, 4)).toBe('data');

    expect(view.getUint16(20, true)).toBe(1); // PCM format
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(44100); // sample rate
    expect(view.getUint16(34, true)).toBe(16); // bit depth
    expect(view.getUint32(40, true)).toBe(samples.length * 2); // data chunk size
    expect(view.byteLength).toBe(44 + samples.length * 2); // header + data
  });

  it('converts float samples to 16-bit PCM and clamps out-of-range values', async () => {
    const samples = new Float32Array([0, 1, -1, 2, -2]);
    const view = await bytes(audioBufferToWav(makeBuffer([samples])));

    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBe(0x7fff); // 1.0 → max
    expect(view.getInt16(48, true)).toBe(-0x8000); // -1.0 → min
    expect(view.getInt16(50, true)).toBe(0x7fff); // 2.0 clamped
    expect(view.getInt16(52, true)).toBe(-0x8000); // -2.0 clamped
  });

  it('interleaves stereo channels', async () => {
    const left = new Float32Array([1, 1]);
    const right = new Float32Array([-1, -1]);
    const view = await bytes(audioBufferToWav(makeBuffer([left, right])));

    expect(view.getUint16(22, true)).toBe(2); // stereo
    expect(view.getUint16(32, true)).toBe(4); // block align: 2ch × 2 bytes
    // Samples alternate L, R, L, R
    expect(view.getInt16(44, true)).toBe(0x7fff);
    expect(view.getInt16(46, true)).toBe(-0x8000);
    expect(view.getInt16(48, true)).toBe(0x7fff);
    expect(view.getInt16(50, true)).toBe(-0x8000);
  });
});
