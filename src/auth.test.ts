import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { parse_config } from "./config";
import { DEV_PATH_PREFIX, TEST_USER } from "./dev/oidc_provider";
import { create_server } from "./server";
import { create_session_store } from "./session";

const config = parse_config();

let server: ReturnType<typeof create_server>;

// Each test needs a fresh Chrome profile — without this, Chrome reuses cookies
// between WebView instances in CI and the previous test's session leaks in.
const make_web_view_options = (): ConstructorParameters<
  typeof Bun.WebView
>[0] =>
  process.platform === "linux"
    ? {
        backend: {
          type: "chrome",
          argv: [
            "--no-sandbox",
            `--user-data-dir=/tmp/bun-webview-${crypto.randomUUID()}`,
          ],
        },
      }
    : {};

const has_visible_text = async (view: Bun.WebView, text: string) =>
  (await view.evaluate(
    `document.body.textContent.includes(${JSON.stringify(text)})`,
  )) as boolean;

beforeAll(() => {
  const session_store = create_session_store(config.SESSION_SECRET);
  server = create_server(config.PORT, session_store, config);
});

afterAll(() => {
  server.stop();
});

const base_url = `http://localhost:${config.PORT}`;

describe("Simulateur ProConnect (___dev___)", () => {
  it("expose le document de découverte OIDC", async () => {
    const discovery_url = `${base_url}${DEV_PATH_PREFIX}/.well-known/openid-configuration`;
    const res = await fetch(discovery_url);
    const doc = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(doc.issuer).toBe(`${base_url}${DEV_PATH_PREFIX}`);
    expect(doc.authorization_endpoint).toContain("/authorize");
    expect(doc.token_endpoint).toContain("/token");
  });

  it("expose les clés publiques JWKS", async () => {
    const res = await fetch(`${base_url}${DEV_PATH_PREFIX}/jwks`);
    const jwks = (await res.json()) as { keys: unknown[] };

    expect(res.status).toBe(200);
    expect(jwks.keys.length).toBeGreaterThan(0);
  });
});

describe("Flux de connexion ProConnect", () => {
  it("affiche le simulateur après avoir cliqué sur S'identifier", async () => {
    await using view = new Bun.WebView(make_web_view_options());
    await view.navigate(base_url);

    await view.evaluate(
      "document.querySelector(\"form[action='/login']\").submit()",
    );
    await Bun.sleep(1000);

    expect(await has_visible_text(view, "Simulateur ProConnect")).toBe(true);
    expect(await has_visible_text(view, TEST_USER.usual_name)).toBe(true);
    expect(await has_visible_text(view, TEST_USER.given_name)).toBe(true);
  }, 30_000);

  it("affiche le compte après connexion via le simulateur", async () => {
    await using view = new Bun.WebView(make_web_view_options());
    await view.navigate(base_url);

    // Submit login form
    await view.evaluate(
      "document.querySelector(\"form[action='/login']\").submit()",
    );
    await Bun.sleep(500);

    // Click connect button on simulator page
    await view.evaluate(
      "document.querySelector(\"button[type='submit']\").click()",
    );
    await Bun.sleep(1000);

    expect(await has_visible_text(view, "Votre compte")).toBe(true);
    expect(
      await has_visible_text(
        view,
        `${TEST_USER.usual_name} ${TEST_USER.given_name}`,
      ),
    ).toBe(true);
    expect(await has_visible_text(view, TEST_USER.email)).toBe(true);
    expect(await has_visible_text(view, TEST_USER.siret)).toBe(true);
  }, 30_000);

  it("retourne à l'accueil après déconnexion", async () => {
    await using view = new Bun.WebView(make_web_view_options());
    await view.navigate(base_url);

    // Login
    await view.evaluate(
      "document.querySelector(\"form[action='/login']\").submit()",
    );
    await Bun.sleep(500);
    await view.evaluate(
      "document.querySelector(\"button[type='submit']\").click()",
    );
    await Bun.sleep(1000);

    // Logout
    await view.evaluate(
      "document.querySelector(\"a[href='/logout']\").click()",
    );
    await Bun.sleep(500);

    expect(
      await has_visible_text(view, "Bienvenue chez le Dr. ProConnect"),
    ).toBe(true);
    expect(await has_visible_text(view, "Votre compte")).toBe(false);
  }, 30_000);
});
