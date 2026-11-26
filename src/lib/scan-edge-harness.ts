/**
 * TEST HARNESS for `supabase/functions/identify-plant/index.ts`. Not application code: nothing under
 * `src/app` or `src/components` imports it, and `scan-edge-receipts.test.ts` fails if one does.
 *
 * It lets vitest run the REAL request handler — the same source Deno serves — without Deno, a
 * network, a provider key or a database:
 *   - `Deno.env` / `Deno.serve` are stubbed so importing the module captures its handler;
 *   - `npm:@supabase/supabase-js@2` is replaced (by the test's `vi.mock`) with `supabaseMock`, whose
 *     `createClient` hands out a caller client (anon key; resolves a bearer token to a user) or the
 *     service-role `admin` client a test installs;
 *   - `fetch` is replaced with a scripted PlantNet answer, so no credit is ever spent.
 *
 * It holds no credential: every key below is the literal word "test".
 */

export const ENV: Record<string, string> = {
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_ANON_KEY: 'anon-test',
  SUPABASE_SERVICE_ROLE_KEY: 'service-test',
  PLANTNET_API_KEY: 'plantnet-test',
  SCAN_QUOTA_SALT: 'salt-test',
};

export type Reply = { data: unknown; error: { message?: string; code?: string } | null };

/** The surface of a supabase-js client the function touches. */
export interface AdminFake {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<Reply>;
  from(table: string): unknown;
}

export const router: {
  admin: AdminFake | null;
  /** `Bearer <token>` -> user id. A header with no entry resolves to no user (anonymous). */
  tokens: Record<string, string>;
  callerCalls: string[];
} = { admin: null, tokens: {}, callerCalls: [] };

/** A chain that accepts any builder call and resolves to an empty success. */
export function inertBuilder(): unknown {
  const done: Reply = { data: null, error: null };
  const handler: ProxyHandler<object> = {
    get(_t, prop) {
      if (prop === 'then') return (res: (v: Reply) => unknown) => Promise.resolve(done).then(res);
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

export const supabaseMock = {
  createClient(_url: string, key: string, options?: { global?: { headers?: Record<string, string> } }) {
    if (key === ENV.SUPABASE_ANON_KEY) {
      const header = options?.global?.headers?.Authorization;
      return {
        auth: {
          async getUser() {
            const id = header ? router.tokens[header] : undefined;
            return { data: { user: id ? { id } : null }, error: null };
          },
        },
        // The caller's own client must never be asked for a capture call: it holds the player's JWT,
        // and these are service-role-only. Recording it lets a test prove the function never does.
        rpc(name: string) {
          router.callerCalls.push(name);
          return Promise.resolve({ data: null, error: { message: 'caller client has no such call' } });
        },
        from(table: string) {
          router.callerCalls.push(`from:${table}`);
          return inertBuilder();
        },
      };
    }
    return router.admin;
  },
};

// ── The provider ─────────────────────────────────────────────────────────────

export interface ProviderPlan {
  /** `ok` -> a PlantNet answer built from `names`; `fail` -> a 502; `empty` -> PlantNet's 404. */
  mode: 'ok' | 'fail' | 'empty';
  names: Array<{ name: string; score: number; gbif?: string; powo?: string }>;
}
export const provider = { plan: { mode: 'ok', names: [] } as ProviderPlan, calls: 0 };

export function installFetch(): () => void {
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (!url.startsWith('https://my-api.plantnet.org/')) throw new Error(`unexpected fetch ${url}`);
    provider.calls += 1;
    if (provider.plan.mode === 'fail') return new Response('upstream', { status: 502 });
    if (provider.plan.mode === 'empty') return new Response('{}', { status: 404 });
    return new Response(
      JSON.stringify({
        results: provider.plan.names.map((n) => ({
          score: n.score,
          species: { scientificNameWithoutAuthor: n.name, commonNames: [] },
          gbif: { id: n.gbif ?? '1' },
          powo: { id: n.powo ?? '1-1' },
        })),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;
  return () => {
    globalThis.fetch = real;
  };
}

// ── Loading and calling the handler ──────────────────────────────────────────

type Handler = (req: Request) => Promise<Response>;

export async function loadHandler(
  importIndex: () => Promise<unknown>,
  extraEnv: Record<string, string> = {},
): Promise<Handler> {
  let handler: Handler | null = null;
  const env = { ...ENV, ...extraEnv };
  (globalThis as unknown as { Deno: unknown }).Deno = {
    env: { get: (key: string) => env[key] },
    serve: (h: Handler) => {
      handler = h;
    },
  };
  await importIndex();
  if (!handler) throw new Error('identify-plant did not register a handler');
  return handler;
}

/**
 * A JPEG-shaped blob whose bytes differ per `seed`, so every "photograph" has its own digest. The
 * function never decodes an image, so the content only has to be bytes.
 */
export function fakeImage(seed: string): File {
  return new File([new TextEncoder().encode(`not-really-a-jpeg:${seed}`)], `${seed}.jpg`, { type: 'image/jpeg' });
}

export interface InvokeOptions {
  images?: File[];
  fields?: Record<string, string>;
  token?: string;
  headers?: Record<string, string>;
}

export async function invoke(handler: Handler, options: InvokeOptions = {}): Promise<{ status: number; text: string; body: Record<string, unknown> }> {
  const form = new FormData();
  for (const image of options.images ?? [fakeImage('a'), fakeImage('b')]) {
    form.append('image', image);
    form.append('organ', 'auto');
  }
  for (const [k, v] of Object.entries(options.fields ?? {})) form.append(k, v);
  const headers: Record<string, string> = {
    Authorization: options.token ? `Bearer ${options.token}` : `Bearer ${ENV.SUPABASE_ANON_KEY}`,
    'cf-connecting-ip': '203.0.113.7',
    ...(options.headers ?? {}),
  };
  const response = await handler(new Request('http://localhost/identify-plant', { method: 'POST', body: form, headers }));
  const text = await response.text();
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(text);
  } catch {
    /* leave empty */
  }
  return { status: response.status, text, body };
}
