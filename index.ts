import { Elysia } from "elysia";

// 1. Define the Safe Methods (GET/HEAD don't change state, so they skip CSRF)
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// 2. Define Allowed Fetch Sites
// 'same-origin': Request comes from your own API (e.g., fetch('/api'))
// 'same-site':   Request comes from your domain (e.g., app.example.com -> api.example.com)
const ALLOWED_SITES = new Set(["same-origin", "same-site"]);

export const modernCsrf =
    (config?: { trustedOrigins?: string[] }) => (app: Elysia) => {
        return app
            .onBeforeHandle(({ request, set }) => {
                // A. Skip verification for Safe Methods (GET, HEAD, etc.)
                if (SAFE_METHODS.has(request.method)) return;

                // B. Get the header
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
                set.status = 403;
                return "Forbidden: Cross-Site Request Blocked";
            })
            .onAfterHandle(({ set }) => {
                // D. Append 'Sec-Fetch-Site' to Vary header
                // This ensures caches treat requests from different origins differently
                const currentVary = set.headers["Vary"];
                const varyString =
                    typeof currentVary === "string" ? currentVary : "";

                if (!varyString.includes("Sec-Fetch-Site")) {
                    set.headers["Vary"] = varyString
                        ? `${varyString}, Sec-Fetch-Site`
                        : "Sec-Fetch-Site";
                }
            });
    };
