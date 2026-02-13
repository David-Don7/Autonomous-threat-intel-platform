import Constants from "expo-constants";

/* ── Auto-detect the dev-server host IP ────────────────────────────── */
function detectHostIP() {
  try {
    // Expo Go exposes the bundler host as "IP:PORT"
    const debuggerHost =
      Constants.expoGoConfig?.debuggerHost ??
      Constants.manifest?.debuggerHost ??
      Constants.manifest2?.extra?.expoGo?.debuggerHost ??
      "";
    const ip = debuggerHost.split(":")[0];
    if (ip && ip !== "localhost" && ip !== "127.0.0.1") return ip;
  } catch (_) {
    /* ignore */
  }
  return "localhost";
}

const HOST_IP = detectHostIP();
const PORT = "8000";

/* ── Shared mutable config ─────────────────────────────────────────── */
const config = {
  apiUrl: `http://${HOST_IP}:${PORT}/api`,
  wsUrl: `ws://${HOST_IP}:${PORT}/ws`,
  _listeners: new Set(),

  /** Update both URLs and notify listeners */
  setUrls(apiUrl, wsUrl) {
    this.apiUrl = apiUrl;
    this.wsUrl = wsUrl;
    this._listeners.forEach((fn) => fn({ apiUrl, wsUrl }));
  },

  /** Subscribe to URL changes – returns unsubscribe function */
  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  },
};

export default config;
