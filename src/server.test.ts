import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { parse_config } from "./config";
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

const click_text = async (view: Bun.WebView, text: string) =>
  view.evaluate(
    `[...document.querySelectorAll('button,a,input[type=submit]')]
      .find(el => el.textContent.includes(${JSON.stringify(text)}))?.click()`,
  );

beforeAll(() => {
  const session_store = create_session_store(config.SESSION_SECRET);
  server = create_server(config.PORT, session_store, config);
});

afterAll(() => {
  server.stop();
});

const base_url = `http://localhost:${config.PORT}`;

describe("Page d'accueil", () => {
  it("accueille l'utilisateur", async () => {
    await using view = new Bun.WebView(make_web_view_options());
    await view.navigate(base_url);

    expect(
      await has_visible_text(view, "Bienvenue chez le Dr. ProConnect"),
    ).toBe(true);
  }, 30_000);

  it("propose une connexion standard", async () => {
    await using view = new Bun.WebView(make_web_view_options());
    await view.navigate(base_url);

    expect(await has_visible_text(view, "Connexion standard")).toBe(true);
  }, 30_000);

  it("propose une connexion double authentification (2FA)", async () => {
    await using view = new Bun.WebView(make_web_view_options());
    await view.navigate(base_url);

    expect(
      await has_visible_text(view, "Connexion double authentification (2FA)"),
    ).toBe(true);
  }, 30_000);

  it("propose une connexion avec certification dirigeant", async () => {
    await using view = new Bun.WebView(make_web_view_options());
    await view.navigate(base_url);

    expect(
      await has_visible_text(view, "Connexion avec certification dirigeant"),
    ).toBe(true);
  }, 30_000);

  it("affiche le bouton S'identifier avec ProConnect", async () => {
    await using view = new Bun.WebView(make_web_view_options());
    await view.navigate(base_url);

    expect(await has_visible_text(view, "S'identifier avec ProConnect")).toBe(
      true,
    );
  }, 30_000);
});

describe("Connexion avec ProConnect", () => {
  it("affiche les informations du compte après connexion", async () => {
    await using view = new Bun.WebView(make_web_view_options());
    await view.navigate(base_url);

    await click_text(view, "S'identifier avec ProConnect");
    await Bun.sleep(500);
    await click_text(view, "Se connecter avec ProConnect");
    await Bun.sleep(1000);

    expect(await has_visible_text(view, "Votre compte")).toBe(true);
    expect(await has_visible_text(view, "DUBOIS Angela")).toBe(true);
    expect(await has_visible_text(view, "hyyypertool@yopmail.com")).toBe(true);
    expect(await has_visible_text(view, "13002526500013")).toBe(true);
  }, 30_000);

  it("permet de se déconnecter", async () => {
    await using view = new Bun.WebView(make_web_view_options());
    await view.navigate(base_url);

    await click_text(view, "S'identifier avec ProConnect");
    await Bun.sleep(500);
    await click_text(view, "Se connecter avec ProConnect");
    await Bun.sleep(1000);

    await click_text(view, "Se déconnecter");
    await Bun.sleep(500);

    expect(
      await has_visible_text(view, "Bienvenue chez le Dr. ProConnect"),
    ).toBe(true);
    expect(await has_visible_text(view, "Votre compte")).toBe(false);
  }, 30_000);
});
