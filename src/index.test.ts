import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { handler } from "./handler";

const TEST_PORT = 3001;
let server: ReturnType<typeof Bun.serve>;

// --no-sandbox is required in CI Linux environments (Docker/container)
const webViewOptions: ConstructorParameters<typeof Bun.WebView>[0] =
  process.platform === "linux"
    ? { backend: { type: "chrome", argv: ["--no-sandbox"] } }
    : {};

beforeAll(() => {
  server = Bun.serve({ port: TEST_PORT, fetch: handler });
});

afterAll(() => {
  server.stop();
});

describe("Docteur ProConnect", () => {
  it("shows the welcome heading", async () => {
    await using view = new Bun.WebView(webViewOptions);
    await view.navigate(`http://localhost:${TEST_PORT}`);

    const heading = await view.evaluate(
      `document.querySelector("h1")?.textContent`,
    );

    expect(heading).toContain("Dr. ProConnect");
  }, 30_000);

  it("offers a standard login button", async () => {
    await using view = new Bun.WebView(webViewOptions);
    await view.navigate(`http://localhost:${TEST_PORT}`);

    const form = await view.evaluate(
      `document.querySelector('form[action="/login"]') !== null`,
    );

    expect(form).toBe(true);
  }, 30_000);

  it("offers a 2FA login button", async () => {
    await using view = new Bun.WebView(webViewOptions);
    await view.navigate(`http://localhost:${TEST_PORT}`);

    const form = await view.evaluate(
      `document.querySelector('form[action="/force-2fa"]') !== null`,
    );

    expect(form).toBe(true);
  }, 30_000);

  it("offers a certification dirigeant login button", async () => {
    await using view = new Bun.WebView(webViewOptions);
    await view.navigate(`http://localhost:${TEST_PORT}`);

    const form = await view.evaluate(
      `document.querySelector('form[action="/force-certification-dirigeant"]') !== null`,
    );

    expect(form).toBe(true);
  }, 30_000);
});
