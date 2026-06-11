// Mock OIDC provider — only mounted when NODE_ENV !== "production"

// oauth4webapi's replaceDoubleSlash normalises // → / in paths when building
// the discovery URL, so we omit the http:// scheme from the path prefix.
const DEV_PATH_PREFIX = "/___dev___/federation.proconnect.gouv.fr/api/v2";

// Fixtures based on real ProConnect sessions captured in HAR files
const TEST_USER_STANDARD = {
  sub: "test-sub-dubois-angela-abc123",
  given_name: "Angela",
  usual_name: "DUBOIS",
  email: "hyyypertool@yopmail.com",
  uid: "hyyypertool@yopmail.com",
  siret: "13002526500013",
  idp_id: "71144ab3-ee1a-4401-b7b3-79b44f7daeeb",
  idp_name: null,
  organizational_unit: "Direction des tests numériques",
  roles: ["agent_public", "agent_public_etat"],
  custom: {},
};

const TEST_USER_CERTIFICATION_DIRIGEANT = {
  sub: "test-sub-dubois-angela-cert-dir",
  given_name: "Angela",
  usual_name: "DUBOIS",
  email: "hyyypertool@yopmail.com",
  uid: "hyyypertool@yopmail.com",
  siret: "83832482000011",
  idp_id: "71144ab3-ee1a-4401-b7b3-79b44f7daeeb",
  idp_name: null,
  organizational_unit: "Direction des tests numériques",
  roles: [],
  custom: {},
};

type FlowType = "standard" | "force_2fa" | "certification_dirigeant";

type PendingAuth = {
  nonce: string;
  state: string;
  redirect_uri: string;
  client_id: string;
  flow_type: FlowType;
};

const pending_codes = new Map<string, PendingAuth>();
const access_tokens = new Map<string, FlowType>();

const get_fixture = (flow_type: FlowType) =>
  flow_type === "certification_dirigeant"
    ? TEST_USER_CERTIFICATION_DIRIGEANT
    : TEST_USER_STANDARD;

const get_acr = (flow_type: FlowType) => {
  if (flow_type === "certification_dirigeant")
    return "https://proconnect.gouv.fr/assurance/certification-dirigeant";
  if (flow_type === "force_2fa")
    return "https://proconnect.gouv.fr/assurance/self-asserted-2fa";
  return "https://proconnect.gouv.fr/assurance/consistency-checked-2fa";
};

let _key_pair: CryptoKeyPair | null = null;
const kid = "dev-rsa-key-1";

const get_key_pair = async (): Promise<CryptoKeyPair> => {
  if (!_key_pair) {
    _key_pair = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"],
    );
  }
  return _key_pair;
};

const base64url = (input: Uint8Array | string): string => {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
};

const sign_jwt = async (payload: Record<string, unknown>): Promise<string> => {
  const { privateKey } = await get_key_pair();
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid }));
  const body = base64url(JSON.stringify(payload));
  const signing_input = `${header}.${body}`;
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(signing_input),
  );
  return `${signing_input}.${base64url(new Uint8Array(sig))}`;
};

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const render_simulator_page = (
  callback_url: string,
  code: string,
  state: string,
  fixture: typeof TEST_USER_STANDARD,
): string => `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Simulateur ProConnect</title>
  <link rel="stylesheet" href="/dsfr/dsfr.min.css" />
</head>
<body>
  <main class="fr-container fr-my-8w">
    <h1>Simulateur ProConnect</h1>
    <p>Vous allez vous connecter en tant que :</p>
    <ul>
      <li>Nom : <strong>${fixture.usual_name} ${fixture.given_name}</strong></li>
      <li>Email : <strong>${fixture.email}</strong></li>
      <li>SIRET : <strong>${fixture.siret}</strong></li>
      <li>Rôles : <strong>${fixture.roles.join(", ")}</strong></li>
    </ul>
    <form method="get" action="${callback_url}">
      <input type="hidden" name="code" value="${code}" />
      <input type="hidden" name="state" value="${state}" />
      <button type="submit" class="fr-btn">Se connecter avec ProConnect</button>
    </form>
  </main>
</body>
</html>`;

export function create_dev_oidc_handler(): (
  req: Request,
) => Promise<Response | null> {
  return async (req: Request): Promise<Response | null> => {
    const url = new URL(req.url);
    const { pathname } = url;

    if (!pathname.startsWith(DEV_PATH_PREFIX)) return null;

    const issuer = `${url.protocol}//${url.host}${DEV_PATH_PREFIX}`;
    const endpoint = pathname.slice(DEV_PATH_PREFIX.length) || "/";

    // OIDC discovery
    if (
      endpoint === "/.well-known/openid-configuration" &&
      req.method === "GET"
    ) {
      return json({
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        userinfo_endpoint: `${issuer}/userinfo`,
        end_session_endpoint: `${issuer}/session/end`,
        jwks_uri: `${issuer}/jwks`,
        response_types_supported: ["code"],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["RS256"],
        userinfo_signing_alg_values_supported: ["none"],
        token_endpoint_auth_methods_supported: [
          "client_secret_post",
          "client_secret_basic",
        ],
        claims_supported: [
          "sub",
          "given_name",
          "usual_name",
          "email",
          "uid",
          "siret",
          "idp_id",
          "idp_name",
          "organizational_unit",
          "roles",
          "acr",
          "amr",
          "auth_time",
          "nonce",
        ],
      });
    }

    // JWKS
    if (endpoint === "/jwks" && req.method === "GET") {
      const { publicKey } = await get_key_pair();
      const jwk = await crypto.subtle.exportKey("jwk", publicKey);
      return json({ keys: [{ ...jwk, kid, use: "sig", alg: "RS256" }] });
    }

    // Authorization endpoint — show simulator login page
    if (endpoint === "/authorize" && req.method === "GET") {
      const nonce = url.searchParams.get("nonce") ?? "";
      const state = url.searchParams.get("state") ?? "";
      const redirect_uri = url.searchParams.get("redirect_uri") ?? "";
      const client_id = url.searchParams.get("client_id") ?? "";
      const login_type = url.searchParams.get("login_type");
      const flow_type: FlowType =
        login_type === "certification_dirigeant"
          ? "certification_dirigeant"
          : login_type === "force_2fa"
            ? "force_2fa"
            : "standard";

      const code = crypto.randomUUID();
      pending_codes.set(code, {
        nonce,
        state,
        redirect_uri,
        client_id,
        flow_type,
      });

      const fixture = get_fixture(flow_type);
      const callback_url = `${issuer}/authorize/callback`;
      return new Response(
        render_simulator_page(callback_url, code, state, fixture),
        {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        },
      );
    }

    // Authorization callback — browser submits the simulator form here
    if (endpoint === "/authorize/callback" && req.method === "GET") {
      const code = url.searchParams.get("code") ?? "";
      const state = url.searchParams.get("state") ?? "";
      const pending = pending_codes.get(code);
      if (!pending) return new Response("code invalide", { status: 400 });

      const redirect = new URL(pending.redirect_uri);
      redirect.searchParams.set("code", code);
      redirect.searchParams.set("state", state);
      redirect.searchParams.set("iss", issuer);
      return new Response(null, {
        status: 302,
        headers: { Location: redirect.toString() },
      });
    }

    // Token endpoint — called server-to-server by openid-client
    if (endpoint === "/token" && req.method === "POST") {
      const params = new URLSearchParams(await req.text());
      const code = params.get("code") ?? "";
      const pending = pending_codes.get(code);
      if (!pending) return json({ error: "invalid_grant" }, 400);
      pending_codes.delete(code);

      const { flow_type } = pending;
      const fixture = get_fixture(flow_type);
      const now = Math.floor(Date.now() / 1000);
      const access_token = crypto.randomUUID();

      access_tokens.set(access_token, flow_type);

      const id_token = await sign_jwt({
        iss: issuer,
        sub: fixture.sub,
        aud: pending.client_id,
        iat: now,
        exp: now + 3600,
        nonce: pending.nonce,
        acr: get_acr(flow_type),
        amr: ["pop", "mfa"],
        auth_time: now,
      });

      return json({
        access_token,
        id_token,
        token_type: "Bearer",
        expires_in: 3600,
      });
    }

    // Userinfo endpoint — called server-to-server by openid-client
    if (endpoint === "/userinfo" && req.method === "GET") {
      const auth_header = req.headers.get("authorization") ?? "";
      const access_token = auth_header.replace(/^Bearer\s+/i, "");
      const flow_type = access_tokens.get(access_token) ?? "standard";
      access_tokens.delete(access_token);
      return json(get_fixture(flow_type));
    }

    // End session endpoint — browser redirect from logout
    if (endpoint === "/session/end" && req.method === "GET") {
      const post_logout = url.searchParams.get("post_logout_redirect_uri");
      return new Response(null, {
        status: 302,
        headers: { Location: post_logout ?? "/" },
      });
    }

    return null;
  };
}

export { DEV_PATH_PREFIX, TEST_USER_STANDARD as TEST_USER };
