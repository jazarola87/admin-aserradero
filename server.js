const { https } = require("firebase-functions");
const { default: next } = require("next");
const path = require("path");

const isDev = process.env.NODE_ENV !== "production";
const nextjsDistDir = path.join(__dirname, ".next");

const server = next({
  dev: isDev,
  conf: { distDir: nextjsDistDir },
});

const nextjsHandle = server.getRequestHandler();

exports.nextServer = https.onRequest((req, res) => {
  return server.prepare().then(() => nextjsHandle(req, res));
});
