import express from 'express';
import axios from 'axios';
import MongoClient from 'mongodb';
import 'dotenv/config';
import { connect } from './db/db.js';
import crud from './db/crud.js'; // Import the CRUD module
import createWhatsAppClient from './whatsappCloudAPI.js';
import handleMessage from './webhook/handleMessage.js';

const { WEBHOOK_VERIFY_TOKEN, GRAPH_API_TOKEN, PORT, ENV } = process.env;

const app = express();

let contactsCollection, messagesCollection, campaignsCollection, log;
let campaigns;

async function initdb() {
  try {
    const db = await connect();
    contactsCollection = crud('wa_contacts', db);
    messagesCollection = crud('wa_messages', db);
    campaignsCollection = crud('wa_campaigns', db);
    log = crud('wa_logs', db);
  } catch (error) {
    console.error('Failed to connect to the database', error);
    process.exit(1); // Exit the app if connection fails
  }
}

async function refreshCampaign() {
  let data = await campaignsCollection.read();
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
  if (ENV === 'PROD')
    // log incoming messages
    log.create({ ...req.body });
  else if (ENV === 'DEV')
    console.log(
      'Logger: Incoming webhook message:',
      JSON.stringify(req.body, null, 2)
    );
  next();
}
async function setCredentials(req, res, next) {
  // setup whatsapp api client
  res.locals.waClient = createWhatsAppClient(
    req.body.entry?.[0].changes?.[0].value?.metadata?.phone_number_id
  );

  // type of payload
  const message = req.body.entry?.[0]?.changes[0]?.value?.messages?.[0];
  if (message) {
    res.locals.type = 'message';
    res.locals.message = message;
  }
  next();
}

app.use(express.json());

app.use(async (req, res, next) => {
  res.locals.collections = {
    contactsCollection,
    messagesCollection,
  };
  res.locals.campaigns = campaigns;
  console.log('setting up collections in res');
  next();
});

app.post('/webhook', [logger, setCredentials], async (req, res) => {
  switch (res.locals.type) {
    case 'message':
      handleMessage(req, res);
      break;
    case 'default':
      console.log('unsupported webhook type: ', res.locals.type);
      res.sendStatus(200);
      break;
  }
});

// accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
// info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // check the mode and token sent are correct
  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    // respond with 200 OK and challenge token from the request
    res.status(200).send(challenge);
    console.log('Webhook verified successfully!');
  } else {
    // respond with '403 Forbidden' if verify tokens do not match
    res.sendStatus(403);
  }
});
app.get('/refresh-campaigns', async (req, res) => {
  await refreshCampaign();
  res.status(200).send('Camapigns refreshed');
});
app.get('/', (req, res) => {
  res.send(`<pre>Nothing to see here.
Checkout README.md to start.</pre>`);
});

main();
