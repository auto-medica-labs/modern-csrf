import { Elysia } from "elysia";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const ALLOWED_SITES = new Set(["same-origin", "same-site"]);

export const modernCsrf =
  (config?: { trustedOrigins?: string[] }) => (app: Elysia) => {
    return app
      .onBeforeHandle(({ request, status }) => {
        if (SAFE_METHODS.has(request.method)) return;

        const secFetchSite = request.headers.get("Sec-Fetch-Site");
        const origin = request.headers.get("Origin");

        // Case 1: Browser says it's from the same origin/site -> PASS
        if (secFetchSite && ALLOWED_SITES.has(secFetchSite)) {
          return;
        }

        // Case 2: It is Cross-Site, but the Origin is explicitly trusted -> PASS
        if (
          secFetchSite === "cross-site" &&
          origin &&
          config?.trustedOrigins?.includes(origin)
        ) {
          return;
        }

        // Case 3: Header is missing, 'none', or 'cross-site' (untrusted) -> FAIL
        return status(403, "Forbidden: Cross-Site Request Blocked");
      })
      .onAfterHandle(({ set }) => {
        // D. Append 'Sec-Fetch-Site' to Vary header
        // This ensures caches treat requests from different origins differently
        const currentVary = set.headers["Vary"];
        const varyString = typeof currentVary === "string" ? currentVary : "";

        if (!varyString.includes("Sec-Fetch-Site")) {
          set.headers["Vary"] = varyString
            ? `${varyString}, Sec-Fetch-Site`
            : "Sec-Fetch-Site";
        }
      });
  };
