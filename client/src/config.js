// Auto-detect URLs based on environment
const isProd = import.meta.env.PROD;

const HTTP = isProd
  ? "" // Same origin in production — relative URLs work
  : "http://localhost:4000";

const WS = isProd
  ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`
  : "ws://localhost:4000";

const config = { HTTP, WS };

export default config;