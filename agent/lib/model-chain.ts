import type { LanguageModelV4 } from "@ai-sdk/provider";
import type {
  LanguageModelV4CallOptions,
  LanguageModelV4GenerateResult,
  LanguageModelV4StreamResult,
} from "@ai-sdk/provider";

/**
 * Provider fallback chain (budget + resilience).
 *
 * Wraps an ordered list of models: the first healthy one serves the call.
 * A model that fails (auth, quota, network, 5xx) is benched for a cooldown
 * window so we don't pay the failed-call latency on every request, and the
 * chain degrades to the next provider — e.g. avalai flash → avalai pro →
 * liara-ai. Streaming falls back only when the failure happens before the
 * first output part (the first part is awaited before committing), so a
 * user never sees duplicated partial answers.
 */

interface ChainOptions {
  /** label per entry, for logs */
  ids?: string[];
  /** ms a failed entry stays benched. default 5 min */
  cooldownMs?: number;
  log?: (msg: string) => void;
}

export class FallbackModel implements LanguageModelV4 {
  readonly specificationVersion = "v4" as const;
  readonly provider: string;
  readonly modelId: string;

  readonly #models: readonly LanguageModelV4[];
  readonly #ids: readonly string[];
  readonly #cooldownMs: number;
  readonly #log: (msg: string) => void;
  readonly #benchedUntil: number[] = [];

  constructor(models: readonly LanguageModelV4[], options: ChainOptions = {}) {
    if (models.length === 0) throw new Error("FallbackModel requires at least one model");
    this.#models = models;
    this.#ids = options.ids ?? models.map((m) => `${m.provider}:${m.modelId}`);
    this.#cooldownMs = options.cooldownMs ?? 5 * 60_000;
    this.#log = options.log ?? (() => {});
    this.provider = models[0]!.provider;
    this.modelId = models[0]!.modelId;
  }

  get supportedUrls(): Record<string, RegExp[]> {
    return {};
  }

  #candidates(): number[] {
    const now = Date.now();
    const out: number[] = [];
    for (let i = 0; i < this.#models.length; i++) {
      if ((this.#benchedUntil[i] ?? 0) > now) continue;
      out.push(i);
    }
    return out.length ? out : [0]; // everything benched → still try the primary
  }

  #bench(i: number, err: unknown) {
    this.#benchedUntil[i] = Date.now() + this.#cooldownMs;
    this.#log(
      `[model-chain] ${this.#ids[i]} failed (${err instanceof Error ? err.message : String(err)}), ` +
        `benched ${Math.round(this.#cooldownMs / 1000)}s`
    );
  }

  async doGenerate(options: LanguageModelV4CallOptions): Promise<LanguageModelV4GenerateResult> {
    let lastErr: unknown;
    for (const i of this.#candidates()) {
      try {
        const res = await this.#models[i]!.doGenerate(options);
        if (i !== 0) this.#log(`[model-chain] generate served by fallback ${this.#ids[i]}`);
        return res;
      } catch (err) {
        lastErr = err;
        this.#bench(i, err);
      }
    }
    throw lastErr;
  }

  async doStream(options: LanguageModelV4CallOptions): Promise<LanguageModelV4StreamResult> {
    let lastErr: unknown;
    for (const i of this.#candidates()) {
      let base: LanguageModelV4StreamResult;
      try {
        base = await this.#models[i]!.doStream(options);
      } catch (err) {
        lastErr = err;
        this.#bench(i, err);
        continue;
      }
      // Await the first part before committing to this model: a failure
      // here (auth, quota, instant 5xx) can still fall through to the next.
      const reader = base.stream.getReader();
      let first: Awaited<ReturnType<ReadableStreamDefaultReader<unknown>['read']>>;
      try {
        first = await reader.read();
      } catch (err) {
        lastErr = err;
        this.#bench(i, err);
        continue;
      }
      const self = this;
      const stream = new ReadableStream<unknown>({
        async start(controller) {
          if (!first.done) controller.enqueue(first.value);
          if (first.done) {
            controller.close();
            return;
          }
          try {
            for (;;) {
              const r = await reader.read();
              if (r.done) break;
              controller.enqueue(r.value);
            }
            controller.close();
          } catch (err) {
            // Mid-stream failure after real output: propagate (a retry
            // would duplicate the already-emitted parts).
            controller.error(err);
          }
        },
        cancel(reason) {
          return reader.cancel(reason);
        },
      });
      if (i !== 0) self.#log(`[model-chain] stream served by fallback ${self.#ids[i]}`);
      return { ...base, stream } as LanguageModelV4StreamResult;
    }
    throw lastErr;
  }
}
