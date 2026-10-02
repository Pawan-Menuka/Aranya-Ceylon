import path from "node:path";

export default {
  resolve: { alias: {
    "@": path.resolve("aranya-next/src"),
    "next/server": path.resolve("aranya-next/node_modules/next/server.js"),
    "next/headers": path.resolve("aranya-next/node_modules/next/headers.js"),
    "next/cache": path.resolve("aranya-next/node_modules/next/cache.js"),
  } },
  test: { include: ["scripts/performance/*.test.ts"], environment: "node", testTimeout: 10000 },
};
