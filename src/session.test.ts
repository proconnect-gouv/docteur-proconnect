import { describe, expect, it } from "bun:test";
import { create_session_store } from "./session";

const SECRET = "test-session-secret-32-chars-ok!";

// Extract "pc_session=<id>.<sig>" from a Set-Cookie string.
const cookie_value = (set_cookie: string): string =>
  set_cookie.split(";")[0]!.trim();

const make_request = (cookie: string): Request =>
  new Request("http://localhost/", { headers: { cookie } });

describe("Cookie forgery resistance", () => {
  it("accepts a legitimately issued cookie", async () => {
    const store = create_session_store(SECRET);
    const { session_id, cookie } = await store.create("test");

    const session = await store.get(make_request(cookie_value(cookie)));

    expect(session?.session_id).toBe(session_id);
  });

  it("rejects a cookie with a tampered session ID", async () => {
    const store = create_session_store(SECRET);
    const { cookie } = await store.create("test");

    const tampered = cookie_value(cookie).replace(
      /pc_session=[^.]+\./,
      `pc_session=${crypto.randomUUID()}.`,
    );

    expect(await store.get(make_request(tampered))).toBeNull();
  });

  it("rejects a cookie with a tampered signature", async () => {
    const store = create_session_store(SECRET);
    const { cookie } = await store.create("test");

    const value = cookie_value(cookie);
    const flipped = value.slice(-1) === "a" ? "b" : "a";
    const tampered = value.slice(0, -1) + flipped;

    expect(await store.get(make_request(tampered))).toBeNull();
  });

  it("rejects a cookie signed with a different secret", async () => {
    const attacker_store = create_session_store(
      "attacker-secret-32-chars-ok!!!!",
    );
    const { session_id, cookie } = await attacker_store.create("test");
    const forged_cookie = await attacker_store.make_cookie(session_id, "test");

    const real_store = create_session_store(SECRET);

    expect(
      await real_store.get(make_request(cookie_value(forged_cookie))),
    ).toBeNull();
    expect(await real_store.get(make_request(cookie_value(cookie)))).toBeNull();
  });

  it("rejects a cookie with no dot separator", async () => {
    const store = create_session_store(SECRET);

    expect(
      await store.get(make_request("pc_session=no-dot-separator-at-all")),
    ).toBeNull();
  });

  it("rejects a well-signed cookie whose session ID was deleted from the store", async () => {
    const store = create_session_store(SECRET);
    const { session_id, cookie } = await store.create("test");
    store.delete(session_id);

    expect(await store.get(make_request(cookie_value(cookie)))).toBeNull();
  });

  it("rejects a valid-format cookie from a different store instance", async () => {
    const store_a = create_session_store(SECRET);
    const store_b = create_session_store(SECRET);
    const { cookie } = await store_a.create("test");

    // Same secret, valid signature — but session ID is not in store_b's Map.
    expect(await store_b.get(make_request(cookie_value(cookie)))).toBeNull();
  });
});

describe("Cookie flags", () => {
  it("always sets HttpOnly and SameSite=Lax", async () => {
    const store = create_session_store(SECRET);
    const { cookie } = await store.create("test");

    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
  });

  it("sets Secure in production", async () => {
    const store = create_session_store(SECRET);
    const { cookie } = await store.create("production");

    expect(cookie).toContain("Secure");
  });

  it("does not set Secure outside production", async () => {
    const store = create_session_store(SECRET);

    for (const env of ["development", "test"]) {
      const { cookie } = await store.create(env);
      expect(cookie).not.toContain("Secure");
    }
  });
});

describe("Session isolation", () => {
  it("two sessions have different IDs", async () => {
    const store = create_session_store(SECRET);
    const a = await store.create("test");
    const b = await store.create("test");

    expect(a.session_id).not.toBe(b.session_id);
  });

  it("data written to one session is not visible in another", async () => {
    const store = create_session_store(SECRET);
    const a = await store.create("test");
    const b = await store.create("test");

    store.set(a.session_id, { nonce: "only-for-a" });

    const session_b = await store.get(make_request(cookie_value(b.cookie)));
    expect(session_b?.data.nonce).toBeUndefined();
  });
});
