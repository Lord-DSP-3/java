import "dotenv/config";
import fs from "fs";
import fetch from "node-fetch";
import child_process from "child_process";
import express from "express";
import rateLimit from "express-rate-limit";

const {
  PORT = 3000,
  TELEGRAM_TOKEN,
  TELEGRAM_WEBHOOK,
  TRACE_MOE_KEY,
  ANILIST_API_URL = "https://graphql.anilist.co/",
  RAILWAY_STATIC_URL,
  RAILWAY_GIT_COMMIT_SHA,
  HEROKU_SLUG_COMMIT,
} = process.env;

const TELEGRAM_API = "https://api.telegram.org";

const WEBHOOK = RAILWAY_STATIC_URL ? `https://${RAILWAY_STATIC_URL}` : TELEGRAM_WEBHOOK;

if (!TELEGRAM_TOKEN || !WEBHOOK) {
  console.log("Please configure TELEGRAM_TOKEN and TELEGRAM_WEBHOOK first");
  process.exit();
}

console.log(`WEBHOOK: ${WEBHOOK}`);
console.log(`Use trace.moe API: ${TRACE_MOE_KEY ? "with API Key" : "without API Key"}`);
console.log(`Anilist Info Endpoint: ${ANILIST_API_URL}`);

console.log("Setting Telegram webhook...");
await fetch(`${TELEGRAM_API}/bot${TELEGRAM_TOKEN}/setWebhook?url=${WEBHOOK}&max_connections=100`)
  .then((e) => e.json())
  .then((e) => {
    console.log(e);
  });

fetch(`${TELEGRAM_API}/bot${TELEGRAM_TOKEN}/getMe`)
  .then((e) => e.json())
  .then((e) => {
    console.log(e);
    app.locals.botName = e.result?.username;
  });

const app = express();

let REVISION;
try {
  REVISION =
    HEROKU_SLUG_COMMIT ??
    RAILWAY_GIT_COMMIT_SHA ??
    child_process.execSync("git rev-parse HEAD").toString().trim();
} catch (e) {
  REVISION = "";
}
const packageJSON = fs.existsSync("./package.json")
  ? JSON.parse(fs.readFileSync("./package.json"))
  : null;

const getHelpMessage = (botName) =>
  [
    `Bot Name: ${botName ? `@${botName}` : "(unknown)"}`,
    `Java Script`,
    `☕`,
  ].join("\n");

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(
  rateLimit({
    max: 100, // limit each IP to 100 requests
    windowMs: 1000, // per second
    delayMs: 0, // disable delaying - full speed until the max limit is reached
  })
);
app.use(express.json());

const privateMessageHandler = async (message) => {
  const responding_msg = message.reply_to_message ? message.reply_to_message : message;
    if (message.text?.toLowerCase().includes("/start")) {
      return await sendMessage(message.chat.id, getHelpMessage(app.locals.botName), {
        parse_mode: "Markdown",
      });
    }
    return await sendMessage(message.chat.id, "☕");
};




app.post("/", (req, res) => {
  const message = req.body?.message;
  if (message?.chat?.type === "private") {
    privateMessageHandler(message);
  }
  res.sendStatus(204);
});

app.get("/", (req, res) => {
  return res.send(
    `<meta http-equiv="Refresh" content="0; URL=https://t.me/${app.locals.botName ?? ""}">`
  );
});

app.listen(PORT, "0.0.0.0", () => console.log(`server listening on port ${PORT}`));
