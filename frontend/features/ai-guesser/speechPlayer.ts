/** Play 24 kHz s16le PCM as it arrives, or a complete WAV. */

const RATE = 24_000;

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.byteLength + b.byteLength);
  out.set(a, 0);
  out.set(b, a.byteLength);
  return out;
}

function pcm16ToBuffer(ctx: AudioContext, pcm: ArrayBuffer): AudioBuffer {
  const bytes = new Uint8Array(pcm);
  const samples = Math.floor(bytes.byteLength / 2);
  const buffer = ctx.createBuffer(1, Math.max(samples, 1), RATE);
  if (samples === 0) return buffer;
  const view = new DataView(bytes.buffer, bytes.byteOffset, samples * 2);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < samples; i += 1) {
    channel[i] = view.getInt16(i * 2, true) / 32768;
  }
  return buffer;
}

export class PcmPlayer {
  private ctx: AudioContext | null = null;
  private next = 0;
  private sources: AudioBufferSourceNode[] = [];

  private ensure(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext({ sampleRate: RATE });
      this.next = this.ctx.currentTime;
    }
    return this.ctx;
  }

  async resume(): Promise<void> {
    const ctx = this.ensure();
    if (ctx.state === "suspended") await ctx.resume();
  }

  stop(): void {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
    }
    this.sources = [];
    if (this.ctx) this.next = this.ctx.currentTime;
  }

  enqueue(pcm: ArrayBuffer): void {
    if (pcm.byteLength < 2) return;
    const ctx = this.ensure();
    const buffer = pcm16ToBuffer(ctx, pcm);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    const startAt = Math.max(ctx.currentTime, this.next);
    source.start(startAt);
    this.next = startAt + buffer.duration;
    this.sources.push(source);
    source.onended = () => {
      this.sources = this.sources.filter((item) => item !== source);
    };
  }

  async enqueueWav(wav: ArrayBuffer): Promise<void> {
    const ctx = this.ensure();
    const buffer = await ctx.decodeAudioData(wav.slice(0));
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    const startAt = Math.max(ctx.currentTime, this.next);
    source.start(startAt);
    this.next = startAt + buffer.duration;
    this.sources.push(source);
    source.onended = () => {
      this.sources = this.sources.filter((item) => item !== source);
    };
  }

  dispose(): void {
    this.stop();
    void this.ctx?.close();
    this.ctx = null;
  }
}

export async function playSpeechResponse(
  response: Response,
  player: PcmPlayer,
  signal: AbortSignal,
): Promise<void> {
  const type = response.headers.get("content-type") ?? "";
  if (type.includes("wav")) {
    const wav = await response.arrayBuffer();
    if (signal.aborted) return;
    player.stop();
    await player.enqueueWav(wav);
    return;
  }

  const body = response.body;
  if (!body) {
    const all = await response.arrayBuffer();
    if (signal.aborted || all.byteLength < 2) return;
    player.stop();
    player.enqueue(all);
    return;
  }

  const reader = body.getReader();
  let leftover = new Uint8Array(0);
  let started = false;
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      const merged = leftover.byteLength ? concat(leftover, value) : value;
      const even = merged.byteLength & ~1;
      if (even === 0) {
        leftover = merged;
        continue;
      }
      const chunk = merged.buffer.slice(
        merged.byteOffset,
        merged.byteOffset + even,
      );
      leftover = merged.subarray(even);
      if (!started) {
        player.stop();
        started = true;
      }
      player.enqueue(chunk);
    }
  } finally {
    reader.releaseLock();
  }
}
