const WS_URL = 'ws://localhost:8000/ws';

class DashboardSocket {
  constructor(url = WS_URL) {
    this.url = url;
    this.socket = null;
    this.listeners = new Set();
    this.reconnectTimer = null;
  }

  connect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;

    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log('[WS] Connected to backend');
      this._emit({ type: 'connected' });
    };

    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        this._emit(payload);
      } catch (err) {
        console.warn('[WS] Bad payload', err);
      }
    };

    this.socket.onclose = () => {
      console.log('[WS] Disconnected – reconnecting in 3s');
      this._emit({ type: 'disconnected' });
      this.socket = null;
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };

    this.socket.onerror = (err) => {
      console.warn('[WS] Error', err);
    };
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  onMessage(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _emit(payload) {
    this.listeners.forEach((fn) => fn(payload));
  }
}

const socket = new DashboardSocket();
export default socket;
