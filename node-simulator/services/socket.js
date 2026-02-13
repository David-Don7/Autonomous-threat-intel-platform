const WS_URL = "ws://localhost:8000/ws";

export default class BackendSocket {
  constructor(url = WS_URL) {
    this.url = url;
    this.socket = null;
    this.listeners = new Set();
  }

  connect() {
    if (this.socket) {
      return;
    }
    this.socket = new WebSocket(this.url);
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

  onMessage(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
