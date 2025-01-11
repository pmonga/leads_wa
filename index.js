/*global console, process, Buffer, APP_SECRET, Promise*/
import crypto from "crypto";
import express from "express";
import axios from "axios";
import MongoClient from "mongodb";
import "dotenv/config";
import { connect } from "./db/db.js";
import crud from "./db/crud.js"; // Import the CRUD module
import createWhatsAppClient from "./whatsappCloudAPI.js";
import handleMessage from "./webhook/handleMessage.js";
import {
  decryptRequest,
  encryptResponse,
  FlowEndpointException,
  signMessage,
  verifyMessage
} from "./helpers/encryption.js";
import { getNextScreen } from "./flow.js";
import { get, set, del } from "./helpers/storage.js";
import { FLOW_KBM } from "./helpers/config.js";
import {
  createReminderManager,
  interpolateString,
  isInTimeRange
} from "./helpers/utils.js";
import { pipeline } from "stream";
import { sendReminderNewDay } from "./webhook/campaignHandlers/XCD09GCampaignHandlers/handlerFunctions.js";
import { broadcast } from "./helpers/common.js";

const {
  WEBHOOK_VERIFY_TOKEN,
  GRAPH_API_TOKEN,
  PORT,
  ENV,
  PRIVATE_KEY,
  PASSPHRASE,
  PHONE_NUMBER_ID
} = process.env;

const app = express();

let contactsCollection,
  messagesCollection,
  campaignsCollection,
  campaignContactsCollection,
  ledgerCollection,
  log,
  kbmQs,
  contactKbmQs,
  gameStatsCollection;
let campaigns;
const KBMreminder = createReminderManager();

async function initdb() {
  try {
    const db = await connect();
    contactsCollection = crud("wa_contacts", db);
    messagesCollection = crud("wa_messages", db);
    campaignsCollection = crud("wa_campaigns", db);
    campaignContactsCollection = crud("wa_campaign_contacts", db);
    kbmQs = crud("wa_kbm_questions", db);
    contactKbmQs = crud("wa_contact_kbm_questions", db);
    ledgerCollection = crud("wa_ledger", db);
    gameStatsCollection = crud("wa_game_stats", db);
    log = crud("wa_logs", db);
  } catch (error) {
    console.error("Failed to connect to the database", error);
    process.exit(1); // Exit the app if connection fails
  }
}

async function refreshCampaign() {
  let data = await campaignsCollection.read(
    {},
    { projection: { _id: 1, code: 1, utm: 1, tags: 1, name: 1, reply: 1 } }
  );
  campaigns = data.reduce((acc, curr) => {
    // Assuming each object has a 'code' key
    if (curr.code) {
      acc[curr.code] = curr;
    }
    return acc;
  }, {});
}

async function main() {
  await initdb();
  await refreshCampaign();
  app.listen(PORT, () => {
    console.log(`Server is listening on port: ${PORT}`);
  });
}
async function logger(req, res, next) {
  // if (ENV === "PROD")
  //   // log incoming messages
  //   log.create({ ...req.body });
  // else if (ENV === "DEV")
  //   // console.log(
  //   //   "Logger: Incoming webhook message:",
  //   //   JSON.stringify(req.body, null, 2)
  //   // );
  next();
}
async function logError(name, data) {
  await log.create({ type: "error", name, data });
}
async function setCredentials(req, res, next) {
  // type of payload
  if (
    req.body.entry?.[0]?.changes[0]?.value?.messages?.[0] &&
    !req.body.entry?.[0]?.changes[0]?.value?.messages?.[0]?.errors
  ) {
    res.locals.type = "message";
    res.locals.message = req.body.entry?.[0]?.changes[0]?.value?.messages?.[0];
    res.locals.crm = { message: "", utm: {} };
  } else if (req.body.entry?.[0]?.changes[0]?.value?.statuses?.[0]) {
    res.locals.type = "status";
    res.locals.status = req.body.entry?.[0]?.changes[0]?.value?.statuses?.[0];
  }
  next();
}

//app.use(express.json());
app.use(
  express.json({
    // store the raw request body to use it for signature verification
    verify: (req, res, buf, encoding) => {
      req.rawBody = buf?.toString(encoding || "utf8");
    }
  })
);

app.use((req, res, next) => {
  res.locals.collections = {
    contactsCollection,
    messagesCollection,
    campaignsCollection,
    campaignContactsCollection,
    gameStatsCollection,
    ledgerCollection,
    log,
    kbmQs,
    contactKbmQs
  };
  res.locals.campaigns = campaigns;
  res.locals.KBMreminder = KBMreminder;
  // setup whatsapp api client
  res.locals.waClient = createWhatsAppClient(PHONE_NUMBER_ID);
  console.log("setting up collections in res");
  next();
});

app.post("/webhook", [logger, setCredentials], async (req, res) => {
  try {
    console.log("hook type: ", res.locals.type);
    switch (res.locals.type) {
      case "message":
        await handleMessage(req, res);
        break;
      case "status":
        console.log("status: ", res.locals.status);
        break;
      default:
        console.log("unsupported webhook type: ", res.locals.type);
        break;
    }
  } catch (e) {
    console.log("error caught at webhook: ", e);
  } finally {
    res.sendStatus(200);
  }
});

// accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
// info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // check the mode and token sent are correct
  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
    // respond with 200 OK and challenge token from the request
    res.status(200).send(challenge);
    console.log("Webhook verified successfully!");
  } else {
    // respond with '403 Forbidden' if verify tokens do not match
    res.sendStatus(403);
  }
});
app.get("/refresh-campaigns", async (req, res) => {
  await refreshCampaign();
  res.status(200).send("Campaigns refreshed");
});
app.get("/kbm-mktg", async (req, res) => {
  const name = decodeURIComponent(req.query.name);
  const to = decodeURIComponent(req.query.to);
  if (!to) {
    res.send("missing phone number");
    return;
  }
  const waClient = res.locals.waClient;
  const components = [
    {
      type: "header",
      parameters: [
        {
          type: "image",
          image: {
            link: "https://lh3.googleusercontent.com/d/1x5gxRIZiEeuHFBgir9XtSAUrDGwzuO_w"
          }
        }
      ]
    },
    {
      type: "body",
      parameters: [
        {
          type: "text",
          parameter_name: "name",
          text: name
        }
      ]
    }
  ];
  const message = {
    name: "kbmba_invite",
    language: { code: "en" },
    components
  };
  try {
    const result = await waClient.sendTemplateMessage(to, message);
    res.send("Message sent: " + JSON.stringify(result));
  } catch (error) {
    res.send("Error in sending message: " + JSON.stringify(error));
  }
});
app.get("/", (req, res) => {
  res.send(`<pre>Nothing to see here.
Checkout README.md to start.</pre>`);
});

app.get("/kbm", (req, res) => {
  res.redirect(
    `https://wa.me/919811233305?text=%5BXCD09G%5D%7BeyJ1dG1fbWVkaXVtIjoiaW4gYXBwIHJlZmVycmFsIn0=.qvcreREMQFlQlBD6J8fY1uVF6mBJWmyzZTQZZQ+fXI4=%7D%20%0A%0AHi,%20I%20want%20to%20play%20the%20Quiz%20Game.%20%F0%9F%91%8B%0A%0AStart%20Now!%0A`
  );
});

app.get("/sendkbmReminder", async (req, res) => {
  if (!isInTimeRange("10:00", "10:01")) {
    console.log("out of range");
    return res.status(403).send("Not in allowed time range");
  }
  const code = "XCD09G";
  const { collections, waClient, KBMreminder } = res.locals;
  const { contactsCollection, campaignContactsCollection: coll } = collections;
  const pipeline = [
    {
      $match: {
        lastMessageReceivedAt: {
          $gt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        } // Apply filters on indexed fields here
      }
    },
    {
      $lookup: {
        from: "wa_campaign_contacts",
        let: { phone: "$phone" }, // Define a variable for `_id` in the source
        pipeline: [
          {
            $match: {
              $and: [
                { $expr: { $eq: ["$code", code] } },
                { $expr: { $eq: ["$phone", "$$phone"] } }
              ] // Match `reference_id` with `_id` from the source
            }
          }
        ],
        as: "registered"
      }
    },
    {
      $match: {
        registered: { $ne: [] }
      }
    },
    {
      $project: {
        phone: 1
      }
    }
  ];
  const contacts = await contactsCollection
    .collection()
    .aggregate(pipeline)
    .toArray();
  let promises = [];
  contacts.forEach((e) => {
    promises = promises.concat(
      sendReminderNewDay(code, e.phone, {
        coll,
        contactsCollection,
        waClient,
        KBMreminder
      })
    );
  });
  try {
    await Promise.all(promises);
    res
      .status(200)
      .send(`Sent ${promises.length} reminders at ${new Date().toISOString()}`);
  } catch (err) {
    console.warn("error in reminder: ", err);
    res.status(500).send(err);
  }
});

app.get("/broadcast", async (req, res) => {
  const message = decodeURIComponent(req.query.message); // Get 'message' from query parameters
  if (!message) {
    return res.status(400).json({ error: "Message parameter is missing" });
  }
  const { collections, waClient } = res.locals;
  const { contactsCollection } = collections;
  const result = await broadcast(message, waClient, contactsCollection);
  if (result.success) {
    res.status(200).send(result.message);
  } else {
    console.warn("error in broadcast: ", result.error);
    res.status(500).send(result.error);
  }
});

app.get("/encrypt", (req, res) => {
  const { message } = req.query; // Get 'message' from query parameters
  if (!message) {
    return res.status(400).json({ error: "Message parameter is missing" });
  }
  const payload = signMessage(decodeURIComponent(message));
  //console.log(payload);
  res.send(payload);
});

// app.get("/decrypt", (req, res) => {
//   const { message } = req.query; // Get 'message' from query parameters
//   if (!message) {
//     return res.status(400).json({ error: "Message parameter is missing" });
//   }
//   const msg = decodeURIComponent(message);
//   const payload = verifyMessage(msg);
//   console.log(payload);
//   res.send(payload);
// });

app.post("/endpoint", async (req, res) => {
  if (!PRIVATE_KEY) {
    throw new Error(
      'Private key is empty. Please check your env variable "PRIVATE_KEY".'
    );
  }

  if (!isRequestSignatureValid(req)) {
    // Return status code 432 if request signature does not match.
    // To learn more about return error codes visit: https://developers.facebook.com/docs/whatsapp/flows/reference/error-codes#endpoint_error_codes
    return res.status(432).send();
  }

  let decryptedRequest = null;
  try {
    decryptedRequest = decryptRequest(req.body, PRIVATE_KEY, PASSPHRASE);
  } catch (err) {
    console.error(err);
    if (err instanceof FlowEndpointException) {
      return res.status(err.statusCode).send();
    }
    return res.status(500).send();
  }

  const { aesKeyBuffer, initialVectorBuffer, decryptedBody } = decryptedRequest;
  //console.log("💬 Decrypted Request:", decryptedBody);

  // TODO: Uncomment this block and add your flow token validation logic.
  // If the flow token becomes invalid, return HTTP code 427 to disable the flow and show the message in `error_msg` to the user
  // Refer to the docs for details https://developers.facebook.com/docs/whatsapp/flows/reference/error-codes#endpoint_error_codes

  /*
  if (!isValidFlowToken(decryptedBody.flow_token)) {
    const error_response = {
      error_msg: `The message is no longer available`,
    };
    return res
      .status(427)
      .send(
        encryptResponse(error_response, aesKeyBuffer, initialVectorBuffer)
      );
  }
  */

  const screenResponse = await getNextScreen(req, res, decryptedBody);
  //console.log("👉 Response to Encrypt:", screenResponse);

  res.send(encryptResponse(screenResponse, aesKeyBuffer, initialVectorBuffer));
});

function isRequestSignatureValid(req) {
  const APP_SECRET = false;
  if (!APP_SECRET) {
    console.warn(
      "App Secret is not set up. Please Add your app secret in /.env file to check for request validation"
    );
    return true;
  }

  const signatureHeader = req.get("x-hub-signature-256");
  const signatureBuffer = Buffer.from(
    signatureHeader.replace("sha256=", ""),
    "utf-8"
  );

  const hmac = crypto.createHmac("sha256", APP_SECRET);
  const digestString = hmac.update(req.rawBody).digest("hex");
  const digestBuffer = Buffer.from(digestString, "utf-8");

  if (!crypto.timingSafeEqual(digestBuffer, signatureBuffer)) {
    console.error("Error: Request Signature did not match");
    return false;
  }
  return true;
}

main();
