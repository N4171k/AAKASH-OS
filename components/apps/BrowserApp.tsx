"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";

type ThemeMode = 'aakash' | 'paatal' | 'dharti' | 'antariksh'

interface Tab {
  id: string;
  url: string;
  title: string;
  loading: boolean;
  error: string;
  content: string;
  history: string[];
  historyIndex: number;
  favicon?: string;
}

let tabIdCounter = 0;
function newTabId() { return `tab-${++tabIdCounter}`; }

const BLANK_HTML = `<html><body style="margin:0;background:#fff;"></body></html>`;

const NEW_TAB_PAGE = `<html>
<body style="margin:0;font-family:system-ui,sans-serif;background:#f8f9fa;display:flex;flex-direction:column;
align-items:center;justify-content:center;min-height:100vh;color:#555;">
  <div style="font-size:48px;margin-bottom:16px;opacity:0.15;">🌐</div>
  <p style="font-size:15px;opacity:0.45;margin:0;">Enter a URL to browse</p>
</body></html>`;

function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//.test(t)) return t;
  if (!t.includes(".") || t.includes(" ")) {
    return `https://www.google.com/search?q=${encodeURIComponent(t)}`;
  }
  return `https://${t}`;
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

function faviconUrl(url: string): string {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).origin}&sz=32`; }
  catch { return ""; }
}

function makeLoadingPage(): string {
  return `<html><body style="margin:0;display:flex;align-items:center;justify-content:center;
height:100vh;font-family:system-ui;color:#999;background:#fff;">
  <div style="text-align:center">
    <div style="width:32px;height:32px;border:3px solid #e0e0e0;border-top-color:#1a73e8;
border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 16px"></div>
    <p style="font-size:14px;margin:0">Loading…</p>
  </div>
  <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
</body></html>`;
}

function makeErrorPage(url: string, message: string): string {
  const domain = extractDomain(url);
  return `<html><head><title>Can't reach page</title></head>
<body style="margin:0;padding:40px 32px;font-family:system-ui,sans-serif;background:#fff;color:#222;">
  <div style="max-width:480px;margin:80px auto 0">
    <div style="font-size:48px;margin-bottom:24px;opacity:0.2">⚠</div>
    <h1 style="font-size:22px;font-weight:600;margin:0 0 8px">${domain} can't be reached</h1>
    <p style="font-size:14px;color:#666;margin:0 0 24px">${message}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:0 0 24px">
    <ul style="font-size:13px;color:#999;margin:8px 0 0;padding-left:20px;line-height:2">
      <li>The site may block cross-origin embedding (CORS/CSP)</li>
      <li>Check the URL for typos</li>
      <li>Try the ↗ button to open directly in your browser</li>
    </ul>
    <a href="${url}" target="_blank"
      style="display:inline-block;margin-top:28px;padding:8px 16px;background:#1a73e8;
color:#fff;border-radius:6px;font-size:13px;text-decoration:none">Open in new tab ↗</a>
  </div>
</body></html>`;
}

function createTab(url = ""): Tab {
  return {
    id: newTabId(), url, title: url ? extractDomain(url) : "New tab",
    loading: false, error: "", content: url ? "" : NEW_TAB_PAGE,
    history: url ? [url] : [], historyIndex: url ? 0 : -1,
    favicon: url ? faviconUrl(url) : undefined,
  };
}

async function fetchPage(url: string): Promise<{ html: string; title?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch("/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const html = await res.text();
    const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return { html, title: m ? m[1].trim().slice(0, 60) : extractDomain(url) };
  } catch (e: unknown) {
    clearTimeout(timer);
    if (e instanceof DOMException && e.name === "AbortError") throw new Error("Request timed out (15 s)");
    throw e;
  }
}

// ── Tab strip ─────────────────────────────────────────────────────────────────

function TabStrip({ tabs, activeId, onSelect, onClose, onNew }: {
  tabs: Tab[]; activeId: string;
  onSelect: (id: string) => void; onClose: (id: string) => void; onNew: () => void;
}) {
  return (
    <div style={{ display:"flex", alignItems:"flex-end", background:"#dee1e6",
      padding:"6px 6px 0", gap:2, overflowX:"auto", scrollbarWidth:"none" }}>
      {tabs.map(tab => {
        const active = tab.id === activeId;
        return (
          <div key={tab.id} onClick={() => onSelect(tab.id)} style={{
            display:"flex", alignItems:"center", gap:6,
            padding:"5px 10px 6px 12px", minWidth:80, maxWidth:180,
            background: active ? "#fff" : "#c8cdd5",
            borderRadius:"8px 8px 0 0", cursor:"pointer", fontSize:12,
            color: active ? "#222" : "#555", userSelect:"none", flexShrink:0,
            borderTop: active ? "2px solid #1a73e8" : "2px solid transparent",
          }}>
            {tab.loading
              ? <div style={{ width:13, height:13, border:"2px solid #ccc", borderTopColor:"#1a73e8",
                  borderRadius:"50%", animation:"spin .8s linear infinite", flexShrink:0 }} />
              : tab.favicon
                ? <img src={tab.favicon} alt="" style={{ width:13, height:13, flexShrink:0 }}
                    onError={e => (e.target as HTMLImageElement).style.display="none"} />
                : <div style={{ width:13, height:13, borderRadius:"50%", background:"#bbb", flexShrink:0 }} />
            }
            <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {tab.title}
            </span>
            {tabs.length > 1 && (
              <button onClick={e => { e.stopPropagation(); onClose(tab.id); }}
                style={{ flexShrink:0, width:18, height:18, border:"none", background:"none",
                  cursor:"pointer", borderRadius:4, fontSize:14, color:"#666", padding:0, lineHeight:1 }}>
                ×
              </button>
            )}
          </div>
        );
      })}
      <button onClick={onNew} title="New tab" style={{ width:28, height:28, flexShrink:0,
        border:"none", background:"none", cursor:"pointer", fontSize:18, color:"#555",
        borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:2 }}>
        +
      </button>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function BrowserApp({ theme: propTheme }: { theme?: ThemeMode }) {
  const effectiveTheme = propTheme ?? 'aakash'
  const isDark = effectiveTheme === 'paatal' || effectiveTheme === 'antariksh'
  const [tabs, setTabs] = useState<Tab[]>([createTab()]);
  const [activeId, setActiveId] = useState<string>(tabs[0].id);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeTab = tabs.find(t => t.id === activeId) ?? tabs[0];

  useEffect(() => { setInputValue(activeTab.url || ""); }, [activeId, activeTab.url]);

  // ── postMessage: receive navigate events from injected iframe script ───────
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e.data || e.data.type !== "navigate") return;
      const url = e.data.url as string;
      if (url) loadUrl(activeId, url);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  function updateTab(id: string, patch: Partial<Tab>) {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  }

  const loadUrl = useCallback(async (tabId: string, url: string) => {
    if (!url) return;
    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t;
      const newHistory = [...t.history.slice(0, t.historyIndex + 1), url];
      return { ...t, url, loading:true, error:"", content:makeLoadingPage(),
        history:newHistory, historyIndex:newHistory.length - 1, favicon:faviconUrl(url) };
    }));
    try {
      const { html, title } = await fetchPage(url);
      updateTab(tabId, { loading:false, content:html, title: title ?? extractDomain(url) });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load";
      updateTab(tabId, { loading:false, error:message, content:makeErrorPage(url, message), title:extractDomain(url) });
    }
  }, []);

  async function loadUrlNoHistory(tabId: string, url: string) {
    setTabs(prev => prev.map(t => t.id === tabId
      ? { ...t, loading:true, error:"", content:makeLoadingPage() } : t));
    try {
      const { html, title } = await fetchPage(url);
      updateTab(tabId, { loading:false, content:html, title: title ?? extractDomain(url), url });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load";
      updateTab(tabId, { loading:false, error:message, content:makeErrorPage(url, message) });
    }
  }

  function go() {
    const dest = normalizeUrl(inputValue);
    if (dest) loadUrl(activeId, dest);
  }

  function goBack() {
    const tab = tabs.find(t => t.id === activeId);
    if (!tab || tab.historyIndex <= 0) return;
    const newIndex = tab.historyIndex - 1;
    const url = tab.history[newIndex];
    setTabs(prev => prev.map(t => t.id === activeId
      ? { ...t, historyIndex:newIndex, url, loading:true, content:makeLoadingPage() } : t));
    loadUrlNoHistory(activeId, url);
  }

  function goForward() {
    const tab = tabs.find(t => t.id === activeId);
    if (!tab || tab.historyIndex >= tab.history.length - 1) return;
    const newIndex = tab.historyIndex + 1;
    const url = tab.history[newIndex];
    setTabs(prev => prev.map(t => t.id === activeId
      ? { ...t, historyIndex:newIndex, url, loading:true, content:makeLoadingPage() } : t));
    loadUrlNoHistory(activeId, url);
  }

  function refresh() { if (activeTab.url) loadUrlNoHistory(activeId, activeTab.url); }

  function addTab() {
    const tab = createTab();
    setTabs(prev => [...prev, tab]);
    setActiveId(tab.id);
  }

  function closeTab(id: string) {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      return next.length === 0 ? [createTab()] : next;
    });
    if (activeId === id) {
      const idx = tabs.findIndex(t => t.id === id);
      const next = tabs[idx + 1] ?? tabs[idx - 1];
      if (next) setActiveId(next.id);
    }
  }

  const canBack = activeTab.historyIndex > 0;
  const canForward = activeTab.historyIndex < activeTab.history.length - 1;
  const isHttps = activeTab.url.startsWith("https://");
  const isBlank = !activeTab.url;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"#fff",
      borderRadius:12, overflow:"hidden", border:"1px solid #d0d0d0",
      boxShadow:"0 4px 24px rgba(0,0,0,0.08)", fontFamily:"system-ui,-apple-system,sans-serif" }}>

      <TabStrip tabs={tabs} activeId={activeId} onSelect={setActiveId} onClose={closeTab} onNew={addTab} />

      {/* Toolbar */}
      <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 10px",
        background:"#fff", borderBottom:"1px solid #e0e0e0" }}>

        {[
          { label:"←", title:"Back",    onClick:goBack,    disabled:!canBack },
          { label:"→", title:"Forward", onClick:goForward, disabled:!canForward },
          { label: activeTab.loading ? "✕" : "↻",
            title: activeTab.loading ? "Stop" : "Reload",
            onClick: activeTab.loading
              ? () => updateTab(activeId, { loading:false, content:activeTab.content })
              : refresh,
            disabled: isBlank },
        ].map(btn => (
          <button key={btn.label} onClick={btn.onClick} disabled={btn.disabled} title={btn.title}
            style={{ width:30, height:30, border:"none", background:"none",
              cursor: btn.disabled ? "default" : "pointer",
              fontSize: btn.label === "↻" ? 16 : 18,
              color: btn.disabled ? "#ccc" : "#555",
              borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            {btn.label}
          </button>
        ))}

        {/* Address bar */}
        <div style={{ flex:1, display:"flex", alignItems:"center", background:"#f1f3f4",
          borderRadius:20, padding:"0 12px", gap:6, height:32,
          border:"1.5px solid transparent", transition:"border-color .15s,background .15s" }}
          onFocusCapture={e => { e.currentTarget.style.background="#fff"; e.currentTarget.style.borderColor="#1a73e8"; }}
          onBlurCapture={e => { e.currentTarget.style.background="#f1f3f4"; e.currentTarget.style.borderColor="transparent"; }}>

          <span style={{ fontSize:12, color: isHttps ? "#1a7340" : "#888", flexShrink:0 }}>
            {isBlank ? "🌐" : isHttps ? "🔒" : "ℹ️"}
          </span>

          <input ref={inputRef} value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onFocus={e => e.target.select()}
            onKeyDown={e => {
              if (e.key === "Enter") go();
              if (e.key === "Escape") { setInputValue(activeTab.url); inputRef.current?.blur(); }
            }}
            placeholder="Search or enter URL"
            style={{ flex:1, border:"none", outline:"none", background:"transparent",
              fontSize:13, color:"#333", minWidth:0 }} />

          {activeTab.loading && (
            <div style={{ width:14, height:14, border:"2px solid #e0e0e0", borderTopColor:"#1a73e8",
              borderRadius:"50%", animation:"spin .8s linear infinite", flexShrink:0 }} />
          )}

          {inputValue && !activeTab.loading && (
            <button onClick={() => { setInputValue(""); inputRef.current?.focus(); }}
              style={{ width:18, height:18, border:"none", background:"#ccc", cursor:"pointer",
                borderRadius:"50%", color:"#fff", fontSize:12, display:"flex",
                alignItems:"center", justifyContent:"center", flexShrink:0, padding:0 }}>
              ×
            </button>
          )}
        </div>

        {activeTab.url && (
          <a href={activeTab.url} target="_blank" rel="noreferrer" title="Open in new browser tab"
            style={{ width:30, height:30, border:"none", background:"none", cursor:"pointer",
              fontSize:15, color:"#555", borderRadius:6, display:"flex",
              alignItems:"center", justifyContent:"center", textDecoration:"none", flexShrink:0 }}>
            ↗
          </a>
        )}
      </div>

      {/* Progress bar */}
      {activeTab.loading && (
        <div style={{ height:3, background:"#e8f0fe", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, left:0, height:"100%", width:"40%",
            background:"#1a73e8", animation:"progress 1.2s ease-in-out infinite" }} />
          <style>{`@keyframes progress{0%{left:-40%}100%{left:100%}}`}</style>
        </div>
      )}

      {/*
        ── iframe sandbox permissions ──────────────────────────────────────────
        allow-same-origin                    : scripts can read their own DOM/cookies
        allow-scripts                        : JavaScript execution
        allow-forms                          : form submission
        allow-popups                         : window.open / target=_blank
        allow-popups-to-escape-sandbox       : popups open without sandbox restrictions
        allow-modals                         : alert() / confirm() / prompt() — many
                                               button handlers depend on these
        allow-top-navigation-by-user-activation : JS navigation (window.location=) on
                                               real user gestures (clicks), without
                                               allowing auto-redirects to hijack parent
        allow-downloads                      : <a download> and programmatic downloads
        allow-pointer-lock                   : pointer lock API (games, interactive apps)
      */}
      <iframe
        ref={iframeRef}
        key={activeId}
        srcDoc={activeTab.content || BLANK_HTML}
        title="browser"
        style={{ flex:1, border:"none", display:"block", width:"100%", minHeight:0 }}
        sandbox={[
          "allow-same-origin",
          "allow-scripts",
          "allow-forms",
          "allow-popups",
          "allow-popups-to-escape-sandbox",
          "allow-modals",
          "allow-top-navigation-by-user-activation",
          "allow-downloads",
          "allow-pointer-lock",
        ].join(" ")}
        referrerPolicy="no-referrer"
        onLoad={() => {
          try {
            const doc = iframeRef.current?.contentDocument;
            if (doc?.title) updateTab(activeId, { title: doc.title.trim().slice(0, 60) });
          } catch { /* cross-origin, skip */ }
        }}
      />

      {/* Status bar */}
      <div style={{ height:22, background:"#f1f3f4", borderTop:"1px solid #e0e0e0",
        display:"flex", alignItems:"center", padding:"0 12px", fontSize:11,
        color:"#999", gap:12, userSelect:"none" }}>
        <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {activeTab.loading ? `Connecting to ${extractDomain(activeTab.url)}…`
            : activeTab.error ? `Error: ${activeTab.error}`
            : activeTab.url || ""}
        </span>
        <span style={{ flexShrink:0 }}>{tabs.length} tab{tabs.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}