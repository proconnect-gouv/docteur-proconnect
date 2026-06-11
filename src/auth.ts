import * as client from "openid-client";
import type { AppConfig } from "./config";
import type { SessionStore } from "./session";

const obj_to_url_params = (obj: Record<string, unknown>): URLSearchParams => {
  const entries: [string, string][] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    entries.push([k, typeof v === "object" ? JSON.stringify(v) : String(v)]);
  }
  return new URLSearchParams(entries);
};

export function create_auth_handlers(
  config: AppConfig,
  session_store: SessionStore,
) {
  const config_options =
    config.IS_HTTP_PROTOCOL_FORBIDDEN === "True"
      ? undefined
      : { execute: [client.allowInsecureRequests] };

  const get_provider_config = () =>
    client.discovery(
      new URL(config.PC_PROVIDER),
      config.PC_CLIENT_ID,
      {
        id_token_signed_response_alg: config.PC_ID_TOKEN_SIGNED_RESPONSE_ALG,
        userinfo_signed_response_alg: config.PC_USERINFO_SIGNED_RESPONSE_ALG,
      },
      client.ClientSecretPost(config.PC_CLIENT_SECRET),
      config_options,
    );

  const authorization_default_params = {
    redirect_uri: `${config.HOST}${config.CALLBACK_URL}`,
    scope: config.PC_SCOPES,
  };

  const make_login_handler = (extra_params: Record<string, unknown>) => {
    return async (_req: Request): Promise<Response> => {
      const session = await session_store.create(config.NODE_ENV);
      const provider_config = await get_provider_config();
      const nonce = client.randomNonce();
      const state = client.randomState();

      session_store.set(session.session_id, { nonce, state });

      const redirect_url = client.buildAuthorizationUrl(
        provider_config,
        obj_to_url_params({
          nonce,
          state,
          ...authorization_default_params,
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

  const handle_login = make_login_handler({
    claims: {
      id_token: { acr: null, amr: null, auth_time: null },
    },
  });

  const handle_force_2fa = make_login_handler({
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
  });

  const handle_force_certification_dirigeant = make_login_handler({
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
  });

  const handle_callback = async (req: Request): Promise<Response> => {
    const session = await session_store.get(req);
    if (!session) {
      return new Response("Session not found", { status: 400 });
    }

    const current_url = new URL(req.url);
    if (current_url.searchParams.get("error")) {
      throw new client.AuthorizationResponseError(
        `${current_url.searchParams.get("error")} - ${current_url.searchParams.get("error_description")}`,
        { cause: current_url.searchParams },
      );
    }

    const provider_config = await get_provider_config();
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

    return new Response(null, {
      status: 302,
      headers: { Location: "/" },
    });
  };

  const handle_logout = async (req: Request): Promise<Response> => {
    const session = await session_store.get(req);
    const id_token_hint = session?.data.id_token_hint;

    if (session) {
      session_store.delete(session.session_id);
    }

    if (!id_token_hint) {
      return new Response(null, { status: 302, headers: { Location: "/" } });
    }

    const provider_config = await get_provider_config();
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

  return {
    handle_login,
    handle_force_2fa,
    handle_force_certification_dirigeant,
    handle_callback,
    handle_logout,
  };
}

export type AuthHandlers = ReturnType<typeof create_auth_handlers>;
