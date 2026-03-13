const isProd = import.meta.env.PROD;

const HTTP = isProd
  ? "https://talco-production.up.railway.app"
  : "http://localhost:4000";

const WS = isProd
  ? "wss://talco-production.up.railway.app"
  : "ws://localhost:4000";

const config = { HTTP, WS };
export default config;