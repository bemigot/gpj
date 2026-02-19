import { execFileSync } from "node:child_process";

/**
 * Synchronous HTTP GET. Drives Node's built-in fetch in a child process,
 * waits for it to complete, and returns a Response-like object.
 *
 * @param {string} url
 * @param {object} [options]  Passed directly to fetch (e.g. { headers: {...} })
 * @returns {{ ok: boolean, status: number, text(): string, json(): unknown }}
 */
export function get(url, options = {}) {
  const fetchScript = `
const url = ${JSON.stringify(url)};
const options = ${JSON.stringify(options)};
fetch(url, options).then(async (res) => {
  const body = await res.text();
  process.stdout.write(JSON.stringify({ ok: res.ok, status: res.status, body }));
}).catch((err) => {
  process.stderr.write(err.message || String(err));
  process.exit(1);
});
`;

  let raw;
  try {
    raw = execFileSync("node", ["-e", fetchScript], {
      encoding: "utf-8",
      timeout: 30000,
    });
  } catch (err) {
    throw new Error(`http.get: ${err.stderr || err.message}`);
  }

  const { ok, status, body } = JSON.parse(raw);
  return {
    ok,
    status,
    text() { return body; },
    json() { return JSON.parse(body); },
  };
}
