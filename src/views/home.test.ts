import { describe, expect, it } from "bun:test";
import { render_home } from "./home";

// Claims of scopes an SP is not granted (custom, roles, idp_id…) can be absent.
describe("render_home", () => {
  it("renders the account page when the optional claims are absent", () => {
    const html = render_home(
      { email: "a@b.fr", usual_name: "DUPONT" },
      { acr: "eidas1", iat: 1 },
      "csrf",
    );

    expect(html).toContain("Votre compte");
    expect(html).toContain("DUPONT");
    expect(html).toContain("Non renseigné");
  });
});
