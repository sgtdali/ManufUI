const fs = require("fs");
const path = require("path");

function loadRootEnv() {
  const envPath = path.join(__dirname, "..", "..", "..", "..", ".env.local");
  const text = fs.readFileSync(envPath, "utf8");
  const vars = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1).trim();
  }
  return vars;
}

const env = loadRootEnv();

module.exports = {
  SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};
