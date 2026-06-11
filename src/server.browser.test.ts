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

const page_text = async (view: Bun.WebView) =>
  (await view.evaluate(`document.body.textContent`)) as string;

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
    await Bun.sleep(500);
    await click_text(view, "Se connecter avec ProConnect");
    await Bun.sleep(1000);

    const body = await page_text(view);
    expect(body).toContain("Votre compte");
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
    await Bun.sleep(500);
    await click_text(view, "Se connecter avec ProConnect");
    await Bun.sleep(1000);

    const body = await page_text(view);
    expect(body).toContain("Votre compte");
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
    await Bun.sleep(500);
    await click_text(view, "Se connecter avec ProConnect");
    await Bun.sleep(1000);

    const body = await page_text(view);
    expect(body).toContain("Votre compte");
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
    await Bun.sleep(500);
    await click_text(view, "Se connecter avec ProConnect");
    await Bun.sleep(1000);

    await click_text(view, "Se déconnecter");
    await Bun.sleep(500);

    const body = await page_text(view);
    expect(body).toContain("Bienvenue chez le Dr. ProConnect");
    expect(body).not.toContain("Votre compte");
  }, 30_000);
});
