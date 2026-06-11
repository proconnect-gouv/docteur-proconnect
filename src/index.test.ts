import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { handler } from "./handler";

const TEST_PORT = 3001;
let server: ReturnType<typeof Bun.serve>;

beforeAll(() => {
  server = Bun.serve({ port: TEST_PORT, fetch: handler });
});

afterAll(() => {
  server.stop();
});

describe("Docteur ProConnect", () => {
  it("shows a heading with the app name", async () => {
    await using view = new Bun.WebView();
    await view.navigate(`http://localhost:${TEST_PORT}`);

    const heading = await view.evaluate(
      `document.querySelector("h1")?.textContent`,
    );

    expect(heading).toContain("Docteur ProConnect");
  });

  it("tells the user the app is running on bun", async () => {
    await using view = new Bun.WebView();
    await view.navigate(`http://localhost:${TEST_PORT}`);

    const paragraph = await view.evaluate(
      `document.querySelector("p")?.textContent`,
    );

    expect(paragraph).toContain("bun");
  });
});
