const { https } = require("firebase-functions");
const { default: next } = require("next");
const path = require("path");

const isDev = process.env.NODE_ENV !== "production";

const server = next({
  dev: isDev,
  // location of .next generated after running -> yarn build
  conf: { distDir: path.join(__dirname, ".next") },
});

const nextjsHandle = server.getRequestHandler();
exports.nextServer = https.onRequest((req, res) => {
  return server.prepare().then(() => {
    return nextjsHandle(req, res);
  });
});