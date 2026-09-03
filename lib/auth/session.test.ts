import { describe, it, expect, beforeAll } from "vitest";
import { SignJWT } from "jose";
import { signSessionToken, verifySessionToken } from "./session";

beforeAll(() => {
  process.env.SESSION_SECRET = "a".repeat(32);
});

describe("signSessionToken / verifySessionToken", () => {
  it("round-trips a signed token", async () => {
    const token = await signSessionToken("uid-1", "STUDENT");
    const payload = await verifySessionToken(token);
    expect(payload).toEqual({ uid: "uid-1", role: "STUDENT" });
  });

  it("rejects a tampered signature", async () => {
    const token = await signSessionToken("uid-1", "INSTRUCTOR");
    // Flip a middle character, not the last one — the final base64url char
    // of an HMAC carries few enough bits that some flips are no-ops.
    const i = Math.floor(token.length / 2);
    const tampered = token.slice(0, i) + (token[i] === "a" ? "b" : "a") + token.slice(i + 1);
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
    const expired = await new SignJWT({ uid: "uid-1", role: "STUDENT" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 60)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
      .sign(secret);
    expect(await verifySessionToken(expired)).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const otherSecret = new TextEncoder().encode("b".repeat(32));
    const token = await new SignJWT({ uid: "uid-1", role: "STUDENT" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(otherSecret);
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("rejects garbage input without throwing", async () => {
    expect(await verifySessionToken("not-a-jwt")).toBeNull();
  });

  it("rejects a well-formed token missing uid/role claims", async () => {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
    const token = await new SignJWT({ somethingElse: true })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(secret);
    expect(await verifySessionToken(token)).toBeNull();
  });
});
