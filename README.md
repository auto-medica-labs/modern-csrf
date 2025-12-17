# Modern CSRF Protection for Elysia.js

A lightweight, token-free CSRF protection middleware for Elysia.js that leverages modern browser security headers (`Sec-Fetch-Site`) instead of traditional CSRF tokens.

## Why This Approach?

Traditional CSRF protection requires:
- Generating and managing tokens
- Storing tokens in sessions or cookies
- Validating tokens on every request
- Handling token expiration

This middleware uses the `Sec-Fetch-Site` header (supported by all modern browsers) to determine if a request originates from a trusted source, eliminating token management entirely.

## Features

- ✅ **Zero token management** - No tokens to generate, store, or validate
- ✅ **Modern browser support** - Uses `Sec-Fetch-Site` header
- ✅ **Configurable trusted origins** - Allow specific cross-origin requests
- ✅ **Cache-safe** - Properly sets `Vary` header to prevent cache bypasses
- ✅ **Automatic safe method handling** - GET, HEAD, OPTIONS bypass checks
- ✅ **Lightweight** - Minimal overhead

## Usage

### Basic Setup

```typescript
import { Elysia } from "elysia";
import { modernCsrf } from "./modernCsrf";

const app = new Elysia()
  .use(modernCsrf())
  .post("/api/data", () => "Protected endpoint")
  .listen(3000);
```

### With Trusted Origins

If you need to allow requests from specific external domains:

```typescript
const app = new Elysia()
  .use(modernCsrf({
    trustedOrigins: [
      "https://trusted-app.com",
      "https://partner-site.com"
    ]
  }))
  .post("/api/data", () => "Protected endpoint")
  .listen(3000);
```

## How It Works

### 1. Safe Methods Are Allowed

GET, HEAD, and OPTIONS requests automatically pass through since they don't modify state:

```typescript
GET /api/users → ✅ Allowed (read-only)
POST /api/users → 🔍 Checked
```

### 2. Same-Origin/Same-Site Requests Pass

Requests from your own domain or subdomains are trusted:

```typescript
// Request from https://yourapp.com to https://yourapp.com/api
Sec-Fetch-Site: same-origin → ✅ Allowed

// Request from https://app.yoursite.com to https://api.yoursite.com
Sec-Fetch-Site: same-site → ✅ Allowed
```

### 3. Cross-Site Requests Are Blocked (Unless Trusted)

Requests from external domains are blocked by default:

```typescript
// Request from https://evil.com to https://yourapp.com/api
Sec-Fetch-Site: cross-site → ❌ Blocked (403 Forbidden)

// Unless the origin is in trustedOrigins:
Origin: https://trusted-app.com
Sec-Fetch-Site: cross-site → ✅ Allowed
```

### 4. Cache Protection

The middleware adds `Sec-Fetch-Site` to the `Vary` header, ensuring caches don't serve cross-site requests with same-origin cached responses:

```typescript
Vary: Sec-Fetch-Site
```

This prevents attackers from bypassing CSRF checks via cached responses.

## Security Considerations

### Browser Support

The `Sec-Fetch-Site` header is supported in:
- Chrome 76+
- Edge 79+
- Firefox 90+
- Safari 16.4+

### When To Use Trusted Origins

Only add domains to `trustedOrigins` when:
- You control both domains
- You have a legitimate cross-origin API use case
- You trust the origin completely

**Never** add user-provided domains or wildcards.

### HTTPS Required

This protection works best over HTTPS. The `Sec-Fetch-Site` header may not be reliable over HTTP in some browsers.

## API Reference

### `modernCsrf(config?)`

Creates a CSRF protection middleware for Elysia.

#### Parameters

- `config.trustedOrigins?: string[]` - Array of fully qualified origins to trust for cross-site requests

#### Returns

An Elysia plugin function

## Troubleshooting

### "Forbidden: Cross-Site Request Blocked" on legitimate requests

1. Check if the origin should be in `trustedOrigins`
2. Verify requests are coming from same-origin/same-site
3. Check browser DevTools Network tab for `Sec-Fetch-Site` header value

### GET requests are being blocked

This shouldn't happen. Verify:
1. The request method is actually GET
2. No custom overrides are interfering with the middleware

### Cached responses bypassing protection

Ensure the `Vary: Sec-Fetch-Site` header is present in responses. Check:
1. No other middleware is removing the header
2. Your CDN/proxy respects the Vary header

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

## Credits

Built for Elysia.js with ❤️
