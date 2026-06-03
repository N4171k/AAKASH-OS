export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── Test page ─────────────────────────────────────────────────────────────
    if (url === "test://demo") {
      return new Response(TEST_PAGE, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // ── Validate ──────────────────────────────────────────────────────────────
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return new Response(JSON.stringify({ error: "Only http/https URLs are supported" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "identity",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "Upgrade-Insecure-Requests": "1",
        },
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const msg =
        err instanceof Error
          ? err.name === "AbortError" ? "Request timed out (15 s)" : err.message
          : "Network error";
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `HTTP ${response.status}: ${response.statusText}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const contentType = response.headers.get("content-type") ?? "text/html";

    // Non-HTML — stream straight through
    if (!contentType.includes("html") && !contentType.includes("xml")) {
      const blob = await response.arrayBuffer();
      return new Response(blob, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    // ── Rewrite HTML ──────────────────────────────────────────────────────────
    const raw = await response.text();
    const finalUrl = response.url || url;
    const rewritten = rewriteHtml(raw, finalUrl);

    return new Response(rewritten, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Override ANY framing restrictions the origin sent
        "X-Frame-Options": "ALLOWALL",
        "Content-Security-Policy": "",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to process request",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ── HTML rewriter ─────────────────────────────────────────────────────────────

/*
  FRAMEBUSTER KILLER — must run before ANY site script.
  Injected as the very first thing inside <head> so it executes before
  inline scripts in <body> that do `if (top !== self) top.location = ...`
*/
const FRAMEBUSTER_SCRIPT = `<script>
(function() {
  // 1. Neutralise top/parent checks used by framebusters
  try {
    if (window.top !== window.self) {
      Object.defineProperty(window, 'top',    { get: function() { return window.self; }, configurable: true });
      Object.defineProperty(window, 'parent', { get: function() { return window.self; }, configurable: true });
    }
  } catch(e) {}

  // 2. Block beforeunload-based framebusters (they call top.location = ...)
  window.addEventListener('beforeunload', function(e) { e.stopImmediatePropagation(); }, true);

  // 3. Intercept link clicks — post external navigations to parent React app
  //    so the address bar updates instead of opening a new window or failing silently
  document.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el.tagName !== 'A') el = el.parentElement;
    if (!el || !el.href) return;
    var href = el.href;
    // Ignore anchors, javascript:, mailto:, tel:
    if (!href || href.startsWith('#') || /^(javascript|mailto|tel):/.test(href)) return;
    try {
      var dest = new URL(href, location.href).href;
      // Only intercept navigations away from the current origin
      if (new URL(dest).origin !== location.origin) {
        e.preventDefault();
        e.stopImmediatePropagation();
        window.parent.postMessage({ type: 'navigate', url: dest }, '*');
      }
    } catch(ex) {}
  }, true);

  // 4. Intercept form submissions that navigate away
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (!form || !form.action) return;
    try {
      var dest = new URL(form.action, location.href).href;
      if (new URL(dest).origin !== location.origin) {
        e.preventDefault();
        window.parent.postMessage({ type: 'navigate', url: dest }, '*');
      }
    } catch(ex) {}
  }, true);
})();
<\/script>`;

function rewriteHtml(html: string, pageUrl: string): string {
  // 1. Strip meta http-equiv framing/CSP restrictions
  html = html.replace(
    /<meta[^>]+http-equiv\s*=\s*["']?(x-frame-options|content-security-policy|frame-options)["']?[^>]*>/gi,
    ""
  );

  // 2. Remove existing <base> tags
  html = html.replace(/<base[^>]*>/gi, "");

  // 3. Build correct <base href> — use the FULL page URL (not just origin)
  //    so that relative paths like "../style.css" resolve correctly
  const baseHref = pageUrl.endsWith("/") ? pageUrl : pageUrl + "/";
  const baseTag = `<base href="${baseHref.replace(/"/g, "&quot;")}" target="_self">`;

  // 4. Inject framebuster script + base tag as FIRST children of <head>
  //    CRITICAL: must be before site scripts so our property overrides win
  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, (m) => `${m}\n${FRAMEBUSTER_SCRIPT}\n${baseTag}`);
  } else if (/<html[^>]*>/i.test(html)) {
    html = html.replace(/<html([^>]*)>/i, (m) => `${m}\n<head>\n${FRAMEBUSTER_SCRIPT}\n${baseTag}\n</head>`);
  } else {
    html = `<head>\n${FRAMEBUSTER_SCRIPT}\n${baseTag}\n</head>\n` + html;
  }

  // 5. Rewrite protocol-relative URLs → https
  html = html.replace(
    /((?:src|href|action|poster|srcset)\s*=\s*["'])\/\/([^"']+)(["'])/gi,
    (_, attr, rest, close) => `${attr}https://${rest}${close}`
  );
  html = html.replace(/url\(\s*["']?\/\/([^"')]+)["']?\s*\)/gi, (_, rest) => `url('https://${rest}')`);

  return html;
}

// ── Test page ─────────────────────────────────────────────────────────────────
const TEST_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Browser Ready</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#f8f9fa;color:#333;display:flex;
      align-items:center;justify-content:center;min-height:100vh;padding:24px}
    .card{background:#fff;border-radius:12px;border:1px solid #e0e0e0;padding:32px;max-width:480px;width:100%}
    h1{font-size:20px;font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:10px}
    .badge{background:#e6f4ea;color:#1a7340;font-size:12px;font-weight:500;padding:3px 10px;border-radius:20px}
    p{font-size:14px;color:#555;line-height:1.7;margin-top:12px}
    ul{margin-top:12px;padding-left:0;list-style:none;display:flex;flex-direction:column;gap:6px}
    li code{background:#f1f3f4;padding:6px 12px;border-radius:6px;font-size:13px;display:block;border:1px solid #e0e0e0}
    .note{margin-top:16px;font-size:12px;color:#999}
  </style>
</head>
<body>
  <div class="card">
    <h1>🌐 Browser <span class="badge">Ready</span></h1>
    <p>The proxy is connected. Type any URL or search term in the address bar.</p>
    <p style="margin-top:16px;font-weight:500">Try these:</p>
    <ul>
      <li><code>wikipedia.org</code></li>
      <li><code>news.ycombinator.com</code></li>
      <li><code>example.com</code></li>
    </ul>
    <p class="note">Sites with strict CORS/CSP or bot-detection (Cloudflare etc.) may not load in the frame — use the ↗ button to open them directly.</p>
  </div>
</body>
</html>`;