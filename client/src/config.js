const isProd = import.meta.env.PROD;

const HTTP = isProd
  ? "https://yakk-production.up.railway.app"
  : "http://localhost:4000";

const WS = isProd
  ? "wss://yakk-production.up.railway.app"
  : "ws://localhost:4000";

const config = { HTTP, WS };
export default config;