import config from "./config";

export default class BackendSocket {
  constructor() {
    this.url = config.wsUrl;
    this.socket = null;
    this.listeners = new Set();
    this._configUnsub = null;
  }

  connect() {
    if (this.socket) {
      return;
    }
    this.url = config.wsUrl;
    this.socket = new WebSocket(this.url);

    // Auto-reconnect when config changes
    if (!this._configUnsub) {
      this._configUnsub = config.onChange(() => {
        this.reconnect();
      });
    }
    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        this.listeners.forEach((listener) => listener(payload));
      } catch (error) {
        console.warn("Failed to parse WebSocket payload", error);
      }
    };
    this.socket.onclose = () => {
      this.socket = null;
      this.listeners.forEach((listener) => listener({ type: "disconnected" }));
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  reconnect() {
    this.disconnect();
    this.url = config.wsUrl;
    this.connect();
  }

  onMessage(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
