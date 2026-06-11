import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { handler } from "./handler";

const TEST_PORT = 3001;
let server: ReturnType<typeof Bun.serve>;

// --no-sandbox is required in CI Linux environments (Docker/container)
const web_view_options: ConstructorParameters<typeof Bun.WebView>[0] =
  process.platform === "linux"
    ? { backend: { type: "chrome", argv: ["--no-sandbox"] } }
    : {};

const has_visible_text = async (view: Bun.WebView, text: string) =>
  (await view.evaluate(
    `document.body.textContent.includes(${JSON.stringify(text)})`,
  )) as boolean;

beforeAll(() => {
  server = Bun.serve({ port: TEST_PORT, fetch: handler });
});

afterAll(() => {
  server.stop();
});

describe("Docteur ProConnect", () => {
  it("accueille l'utilisateur", async () => {
    await using view = new Bun.WebView(web_view_options);
    await view.navigate(`http://localhost:${TEST_PORT}`);

    expect(
      await has_visible_text(view, "Bienvenue chez le Dr. ProConnect"),
    ).toBe(true);
  }, 30_000);

  it("propose une connexion standard", async () => {
    await using view = new Bun.WebView(web_view_options);
    await view.navigate(`http://localhost:${TEST_PORT}`);

    expect(await has_visible_text(view, "Connexion standard")).toBe(true);
  }, 30_000);

  it("propose une connexion double authentification", async () => {
    await using view = new Bun.WebView(web_view_options);
    await view.navigate(`http://localhost:${TEST_PORT}`);

    expect(
      await has_visible_text(view, "Connexion double authentification (2FA)"),
    ).toBe(true);
  }, 30_000);

  it("propose une connexion avec certification dirigeant", async () => {
    await using view = new Bun.WebView(web_view_options);
    await view.navigate(`http://localhost:${TEST_PORT}`);

    expect(
      await has_visible_text(view, "Connexion avec certification dirigeant"),
    ).toBe(true);
  }, 30_000);

  it("affiche le bouton S'identifier avec ProConnect", async () => {
    await using view = new Bun.WebView(web_view_options);
    await view.navigate(`http://localhost:${TEST_PORT}`);

    expect(await has_visible_text(view, "S'identifier avec ProConnect")).toBe(
      true,
    );
  }, 30_000);
});
