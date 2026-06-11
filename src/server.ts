import * as client from "openid-client";
import type { AppConfig } from "./config";
import { create_dev_oidc_handler } from "./dev/oidc_provider";
import type { SessionStore } from "./session";
import { render_home } from "./views/home";

const root = import.meta.dir + "/..";

const is_dev = process.env.NODE_ENV !== "production";
const dev_oidc = is_dev ? create_dev_oidc_handler() : null;

const obj_to_url_params = (obj: Record<string, unknown>): URLSearchParams => {
  const entries: [string, string][] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    entries.push([k, typeof v === "object" ? JSON.stringify(v) : String(v)]);
  }
  return new URLSearchParams(entries);
};

const get_provider_config = (config: AppConfig) => {
  const config_options =
    config.IS_HTTP_PROTOCOL_FORBIDDEN === "True"
      ? undefined
      : { execute: [client.allowInsecureRequests] };
  return client.discovery(
    new URL(config.PC_PROVIDER),
    config.PC_CLIENT_ID,
    {
      id_token_signed_response_alg: config.PC_ID_TOKEN_SIGNED_RESPONSE_ALG,
      userinfo_signed_response_alg: config.PC_USERINFO_SIGNED_RESPONSE_ALG,
    },
    client.ClientSecretPost(config.PC_CLIENT_SECRET),
    config_options,
  );
};

const make_login_handler = (
  config: AppConfig,
  session_store: SessionStore,
  extra_params: Record<string, unknown>,
) => {
  return async (_req: Request): Promise<Response> => {
    const session = await session_store.create(config.NODE_ENV);
    const provider_config = await get_provider_config(config);
    const nonce = client.randomNonce();
    const state = client.randomState();

    session_store.set(session.session_id, { nonce, state });

    const redirect_url = client.buildAuthorizationUrl(
      provider_config,
      obj_to_url_params({
        nonce,
        state,
        redirect_uri: `${config.HOST}${config.CALLBACK_URL}`,
        scope: config.PC_SCOPES,
        ...extra_params,
      }),
    );

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirect_url.toString(),
        "Set-Cookie": session.cookie,
      },
    });
  };
};

const handle_callback = async (
  req: Request,
  config: AppConfig,
  session_store: SessionStore,
): Promise<Response> => {
  const session = await session_store.get(req);
  if (!session) return new Response("Session not found", { status: 400 });

  const current_url = new URL(req.url);
  if (current_url.searchParams.get("error")) {
    throw new client.AuthorizationResponseError(
      `${current_url.searchParams.get("error")} - ${current_url.searchParams.get("error_description")}`,
      { cause: current_url.searchParams },
    );
  }

  const provider_config = await get_provider_config(config);

  const tokens = await client.authorizationCodeGrant(
    provider_config,
    current_url,
    {
      expectedNonce: session.data.nonce,
      expectedState: session.data.state,
    },
  );

  const claims = tokens.claims();
  const userinfo = await client.fetchUserInfo(
    provider_config,
    tokens.access_token,
    claims?.sub ?? "",
  );

  session_store.set(session.session_id, {
    userinfo: userinfo as Record<string, unknown>,
    idtoken: claims as Record<string, unknown>,
    id_token_hint: tokens.id_token,
    oauth2token: tokens,
  });

  return new Response(null, { status: 302, headers: { Location: "/" } });
};

const handle_logout = async (
  req: Request,
  config: AppConfig,
  session_store: SessionStore,
): Promise<Response> => {
  const session = await session_store.get(req);
  const id_token_hint = session?.data.id_token_hint;

  if (session) session_store.delete(session.session_id);

  if (!id_token_hint) {
    return new Response(null, { status: 302, headers: { Location: "/" } });
  }

  const provider_config = await get_provider_config(config);

  const redirect_url = client.buildEndSessionUrl(
    provider_config,
    obj_to_url_params({
      post_logout_redirect_uri: `${config.HOST}/`,
      id_token_hint,
    }),
  );

  return new Response(null, {
    status: 302,
    headers: { Location: redirect_url.toString() },
  });
};

export function create_server(
  port: number | string,
  session_store: SessionStore,
  config: AppConfig,
) {
  return Bun.serve({
    port,
    routes: {
      "/": async (req) => {
        const session = await session_store.get(req);
        const html = render_home(session?.data.userinfo, session?.data.idtoken);
        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      },
      "/common.css": new Response(Bun.file(`${root}/public/common.css`)),
      "/welcome.svg": new Response(Bun.file(`${root}/public/welcome.svg`)),
      "/login": {
        POST: make_login_handler(config, session_store, {
          claims: { id_token: { acr: null, amr: null, auth_time: null } },
        }),
      },
      "/force-2fa": {
        POST: make_login_handler(config, session_store, {
          claims: {
            id_token: {
              acr: {
                essential: true,
                values: [
                  config.ACR_VALUE_FOR_EIDAS2,
                  config.ACR_VALUE_FOR_EIDAS3,
                  config.ACR_VALUE_FOR_SELF_ASSERTED_2FA,
                  config.ACR_VALUE_FOR_CONSISTENCY_CHECKED_2FA,
                  config.ACR_VALUE_FOR_EIDAS0_MFA,
                  config.ACR_VALUE_FOR_EIDAS1_MFA,
                ],
              },
              amr: null,
              auth_time: null,
            },
          },
        }),
      },
      "/force-certification-dirigeant": {
        POST: make_login_handler(config, session_store, {
          login_type: "certification_dirigeant",
          claims: {
            id_token: {
              acr: {
                essential: true,
                values: [
                  config.ACR_VALUE_FOR_CERTIFICATION_DIRIGEANT,
                  config.ACR_VALUE_FOR_CERTIFICATION_DIRIGEANT_2FA,
                ],
              },
              amr: null,
              auth_time: null,
            },
          },
        }),
      },
      "/login-callback": {
        GET: (req) => handle_callback(req, config, session_store),
      },
      "/logout": {
        GET: (req) => handle_logout(req, config, session_store),
      },
    },
    async fetch(req) {
      const { pathname } = new URL(req.url);

      if (dev_oidc) {
        const dev_response = await dev_oidc(req);
        if (dev_response) return dev_response;
      }

      if (pathname.startsWith("/dsfr/")) {
        return new Response(
          Bun.file(
            `${root}/node_modules/@gouvfr/dsfr/dist${pathname.slice("/dsfr".length)}`,
          ),
        );
      }

      return new Response("Not Found", { status: 404 });
    },
  });
}
