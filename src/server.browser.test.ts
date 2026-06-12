import { afterEach, beforeEach, describe, expect, it } from "bun:test";
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

const page_text = async (view: Bun.WebView) =>
  (await view.evaluate(`document.body.textContent`)) as string;

// Poll instead of fixed sleeps: returns the page text as soon as it contains
// the expected string. evaluate can fail mid-navigation — treat as "not yet".
const wait_for_text = async (view: Bun.WebView, text: string) => {
  const deadline = Date.now() + 10_000;
  while (true) {
    const body = await page_text(view).catch(() => "");
    if (body.includes(text)) return body;
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${JSON.stringify(text)}`);
    }
    await Bun.sleep(50);
  }
};

const click_text = async (view: Bun.WebView, text: string) =>
  view.evaluate(
    `[...document.querySelectorAll('button,a,input[type=submit]')]
      .find(el => el.textContent.includes(${JSON.stringify(text)}))?.click()`,
  );

// Click the ProConnect button inside the section whose heading contains section_text.
// Used when multiple "S'identifier avec ProConnect" buttons appear on the same page.
const click_proconnect_near = async (view: Bun.WebView, section_text: string) =>
  view.evaluate(
    `[...document.querySelectorAll('h6')]
      .find(h => h.textContent.includes(${JSON.stringify(section_text)}))
      ?.closest('.fr-grid-row')
      ?.querySelector('button')
      ?.click()`,
  );

// Fresh store + server per test: in CI, Chrome can reuse a still-running
// instance and leak cookies across WebViews despite the fresh profile above.
// A new store does not know the leaked session ID, so the test starts
// logged out no matter what the browser sends.
beforeEach(() => {
  const session_store = create_session_store(config.SESSION_SECRET);
  server = create_server(config.PORT, session_store, config);
});

afterEach(async () => {
  await server.stop(true);
});

const base_url = `http://localhost:${config.PORT}`;

describe("Page d'accueil", () => {
  it("accueille l'utilisateur", async () => {
    await using view = new Bun.WebView(make_web_view_options());
    await view.navigate(base_url);

    expect(await page_text(view)).toContain("Bienvenue chez le Dr. ProConnect");
  }, 30_000);

  it("propose une connexion standard", async () => {
    await using view = new Bun.WebView(make_web_view_options());
    await view.navigate(base_url);

    expect(await page_text(view)).toContain("Connexion standard");
  }, 30_000);

  it("propose une connexion double authentification (2FA)", async () => {
    await using view = new Bun.WebView(make_web_view_options());
    await view.navigate(base_url);

    expect(await page_text(view)).toContain(
      "Connexion double authentification (2FA)",
    );
  }, 30_000);

  it("propose une connexion avec certification dirigeant", async () => {
    await using view = new Bun.WebView(make_web_view_options());
    await view.navigate(base_url);

    expect(await page_text(view)).toContain(
      "Connexion avec certification dirigeant",
    );
  }, 30_000);

  it("affiche le bouton S'identifier avec ProConnect", async () => {
    await using view = new Bun.WebView(make_web_view_options());
    await view.navigate(base_url);

    expect(await page_text(view)).toContain("S'identifier avec ProConnect");
  }, 30_000);
});

describe("Connexion avec ProConnect", () => {
  it("affiche les informations du compte après connexion standard", async () => {
    await using view = new Bun.WebView(make_web_view_options());
    await view.navigate(base_url);

    await click_text(view, "S'identifier avec ProConnect");
    await wait_for_text(view, "Se connecter avec ProConnect");
    await click_text(view, "Se connecter avec ProConnect");

    const body = await wait_for_text(view, "Votre compte");
    expect(body).toContain("DUBOIS Angela");
    expect(body).toContain("hyyypertool@yopmail.com");
    expect(body).toContain("13002526500013");
    expect(body).toContain("agent_public");
    expect(body).toContain(
      "https://proconnect.gouv.fr/assurance/consistency-checked-2fa",
    );
  }, 30_000);

  it("affiche les informations du compte après connexion double authentification (2FA)", async () => {
    await using view = new Bun.WebView(make_web_view_options());
    await view.navigate(base_url);

    await click_proconnect_near(view, "double authentification");
    await wait_for_text(view, "Se connecter avec ProConnect");
    await click_text(view, "Se connecter avec ProConnect");

    const body = await wait_for_text(view, "Votre compte");
    expect(body).toContain("DUBOIS Angela");
    expect(body).toContain("hyyypertool@yopmail.com");
    expect(body).toContain("13002526500013");
    expect(body).toContain("agent_public");
    expect(body).toContain(
      "https://proconnect.gouv.fr/assurance/self-asserted-2fa",
    );
  }, 30_000);

  it("affiche les informations du compte après connexion avec certification dirigeant", async () => {
    await using view = new Bun.WebView(make_web_view_options());
    await view.navigate(base_url);

    await click_proconnect_near(view, "certification dirigeant");
    await wait_for_text(view, "Se connecter avec ProConnect");
    await click_text(view, "Se connecter avec ProConnect");

    const body = await wait_for_text(view, "Votre compte");
    expect(body).toContain("DUBOIS Angela");
    expect(body).toContain("hyyypertool@yopmail.com");
    expect(body).toContain("83832482000011");
    expect(body).not.toContain("agent_public");
    expect(body).toContain(
      "https://proconnect.gouv.fr/assurance/certification-dirigeant",
    );
  }, 30_000);

  it("permet de se déconnecter", async () => {
    await using view = new Bun.WebView(make_web_view_options());
    await view.navigate(base_url);

    await click_text(view, "S'identifier avec ProConnect");
    await wait_for_text(view, "Se connecter avec ProConnect");
    await click_text(view, "Se connecter avec ProConnect");
    await wait_for_text(view, "Votre compte");

    await click_text(view, "Se déconnecter");

    const body = await wait_for_text(view, "Bienvenue chez le Dr. ProConnect");
    expect(body).not.toContain("Votre compte");
  }, 30_000);
});
