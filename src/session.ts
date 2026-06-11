export interface SessionData {
  userinfo?: Record<string, unknown>;
  idtoken?: Record<string, unknown>;
  id_token_hint?: string;
  oauth2token?: unknown;
  nonce?: string;
  state?: string;
}

export function create_session_store(secret: string) {
  const store = new Map<string, SessionData>();

  const hmac_key_promise = crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

  const sign = async (value: string): Promise<string> => {
    const key = await hmac_key_promise;
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(value),
    );
    return Buffer.from(sig).toString("hex");
  };

  const verify = async (value: string, sig: string): Promise<boolean> => {
    const expected = await sign(value);
    return expected === sig;
  };

  const parse_cookie = async (
    cookie_header: string | null,
  ): Promise<string | null> => {
    if (!cookie_header) return null;
    const match = cookie_header.match(/pc_session=([^;]+)/);
    const raw = match?.[1];
    if (!raw) return null;
    const dot_index = raw.lastIndexOf(".");
    if (dot_index === -1) return null;
    const session_id = raw.slice(0, dot_index);
    const sig = raw.slice(dot_index + 1);
    const valid = await verify(session_id, sig);
    return valid ? session_id : null;
  };

  const make_cookie = async (
    session_id: string,
    node_env: string,
  ): Promise<string> => {
    const sig = await sign(session_id);
    const secure = node_env === "production" ? "; Secure" : "";
    return `pc_session=${session_id}.${sig}; HttpOnly; SameSite=Lax; Path=/${secure}`;
  };

  return {
    get: async (
      req: Request,
    ): Promise<{ session_id: string; data: SessionData } | null> => {
      const session_id = await parse_cookie(req.headers.get("cookie"));
      if (!session_id) return null;
      const data = store.get(session_id);
      if (!data) return null;
      return { session_id, data };
    },

    create: async (
      node_env = "development",
    ): Promise<{ session_id: string; cookie: string }> => {
      const session_id = crypto.randomUUID();
      store.set(session_id, {});
      const cookie = await make_cookie(session_id, node_env);
      return { session_id, cookie };
    },

    set: (session_id: string, data: SessionData): void => {
      store.set(session_id, data);
    },

    delete: (session_id: string): void => {
      store.delete(session_id);
    },

    make_cookie,
  };
}

export type SessionStore = ReturnType<typeof create_session_store>;
