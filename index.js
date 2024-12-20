/*global console, process, Buffer, APP_SECRET*/
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
  FlowEndpointException
} from "./helpers/encryption.js";
import { getNextScreen } from "./flow.js";
import { get, set } from "./helpers/storage.js";
import { FLOW_KBM } from "./helpers/config.js";

const {
  WEBHOOK_VERIFY_TOKEN,
  GRAPH_API_TOKEN,
  PORT,
  ENV,
  PRIVATE_KEY,
  PASSPHRASE
} = process.env;

const app = express();

let contactsCollection,
  messagesCollection,
  campaignsCollection,
  campaignContactsCollection,
  ledgerCollection,
  log;
let campaigns;

async function initdb() {
  try {
    const db = await connect();
    contactsCollection = crud("wa_contacts", db);
    messagesCollection = crud("wa_messages", db);
    campaignsCollection = crud("wa_campaigns", db);
    campaignContactsCollection = crud("wa_campaign_contacts", db);
    ledgerCollection = crud("wa_ledger", db);
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
  if (ENV === "PROD")
    // log incoming messages
    log.create({ ...req.body });
  else if (ENV === "DEV")
    // console.log(
    //   "Logger: Incoming webhook message:",
    //   JSON.stringify(req.body, null, 2)
    // );
    next();
}
async function setCredentials(req, res, next) {
  // setup whatsapp api client
  if (req.body.entry?.[0].changes?.[0].value?.metadata?.phone_number_id) {
    res.locals.waClient = createWhatsAppClient(
      req.body.entry?.[0].changes?.[0].value?.metadata?.phone_number_id
    );
  }

  // type of payload
  const message = req.body.entry?.[0]?.changes[0]?.value?.messages?.[0];
  if (message) {
    res.locals.type = "message";
    res.locals.message = message;
    res.locals.crm = { message: "", utm: {} };
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

app.use(async (req, res, next) => {
  res.locals.collections = {
    contactsCollection,
    messagesCollection,
    campaignsCollection,
    campaignContactsCollection,
    ledgerCollection
  };
  res.locals.campaigns = campaigns;
  console.log("setting up collections in res");
  next();
});

app.post("/webhook", [logger, setCredentials], async (req, res) => {
  try {
    console.log("hook type: ", res.locals.type);
    switch (res.locals.type) {
      case "message":
        //console.log(`inside switch`);
        await handleMessage(req, res);
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
  res.status(200).send("Camapigns refreshed");
});

app.get("/", (req, res) => {
  res.send(`<pre>Nothing to see here.
Checkout README.md to start.</pre>`);
});

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
  console.log("💬 Decrypted Request:", decryptedBody);

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
  console.log("👉 Response to Encrypt:", screenResponse);

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
