import type { AuthHandlers } from "./auth";
import { create_dev_oidc_handler } from "./dev/oidc_provider";
import type { SessionStore } from "./session";
import { render_home } from "./views/home";

const root = import.meta.dir + "/..";

const is_dev = process.env.NODE_ENV !== "production";
const dev_oidc = is_dev ? create_dev_oidc_handler() : null;

export function create_server(
  port: number | string,
  session_store?: SessionStore,
  auth?: AuthHandlers,
) {
  return Bun.serve({
    port,
    routes: {
      "/": async (req) => {
        const session = session_store ? await session_store.get(req) : null;
        const html = render_home(session?.data.userinfo, session?.data.idtoken);
        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      },
      "/common.css": new Response(Bun.file(`${root}/public/common.css`)),
      "/welcome.svg": new Response(Bun.file(`${root}/public/welcome.svg`)),
      "/login": { POST: auth?.handle_login },
      "/force-2fa": { POST: auth?.handle_force_2fa },
      "/force-certification-dirigeant": {
        POST: auth?.handle_force_certification_dirigeant,
      },
      "/login-callback": { GET: auth?.handle_callback },
      "/logout": { GET: auth?.handle_logout },
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
