import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { modernCsrf } from "..";

describe("Modern CSRF", () => {
  const app = new Elysia()
    .use(modernCsrf({ trustedOrigins: ["https://trusted-partner.com"] }))
    .get("/", () => "read allowed")
    .post("/", () => "write allowed");

  describe("Allowed", () => {
    it("should pass GET requests (Safe Method) regardless of headers", async () => {
      const response = await app.handle(
        new Request("http://localhost/", {
          method: "GET",
        }),
      );
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("read allowed");
    });

    it("should pass POST requests from 'same-origin'", async () => {
      const response = await app.handle(
        new Request("http://localhost/", {
          method: "POST",
          headers: {
            "Sec-Fetch-Site": "same-origin",
          },
        }),
      );
      expect(response.status).toBe(200);
    });

    it("should pass POST requests from 'same-site'", async () => {
      const response = await app.handle(
        new Request("http://localhost/", {
          method: "POST",
          headers: {
            "Sec-Fetch-Site": "same-site",
          },
        }),
      );
      expect(response.status).toBe(200);
    });

    it("should pass 'cross-site' requests if the Origin is trusted", async () => {
      const response = await app.handle(
        new Request("http://localhost/", {
          method: "POST",
          headers: {
            "Sec-Fetch-Site": "cross-site",
            Origin: "https://trusted-partner.com",
          },
        }),
      );
      expect(response.status).toBe(200);
    });
  });

  describe("Blocked", () => {
    it("should block 'cross-site' requests if Origin is NOT trusted", async () => {
      const response = await app.handle(
        new Request("http://localhost/", {
          method: "POST",
          headers: {
            "Sec-Fetch-Site": "cross-site",
            Origin: "https://evil-hacker.com",
          },
        }),
      );
      expect(response.status).toBe(403);
      expect(await response.text()).toContain("Forbidden");
    });

    it("should block requests with missing Sec-Fetch-Site header (e.g. CLI tools/Bots)", async () => {
      const response = await app.handle(
        new Request("http://localhost/", {
          method: "POST",
          // Headers explicitly missing
        }),
      );
      expect(response.status).toBe(403);
    });
  });

  describe("Header check", () => {
    it("should append 'Sec-Fetch-Site' to the Vary header", async () => {
      const response = await app.handle(
        new Request("http://localhost/", { method: "GET" }),
      );

      const vary = response.headers.get("Vary");
      expect(vary).toContain("Sec-Fetch-Site");
    });
  });
});
