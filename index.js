import express from 'express';
import axios from 'axios';
import MongoClient from 'mongodb';
import 'dotenv/config';
import { connect } from './db.js';
import crud from './crud.js'; // Import the CRUD module

const { WEBHOOK_VERIFY_TOKEN, GRAPH_API_TOKEN, PORT } = process.env;

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

app.use(express.json());

// app.use(async (req, res, next) => {
//   try {
//     const db = await connect(); // Connect to the database (URI defines the DB)

//     // Initialize CRUD operations for the 'users' and 'orders' collections
//     contactsCollection = crud('wa_contacts', db);
//     messagesCollection = crud('wa_messages', db);
//     next();
//   } catch (error) {
//     console.error('Error initializing collections:', error);
//     res.status(500).send('Database connection failed');
//   }
// });

app.post('/webhook', async (req, res) => {
  // log incoming messages
  log.create(req.body);
  //console.log('Incoming webhook message:', JSON.stringify(req.body, null, 2));

  // check if the webhook request contains a message
  // details on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
  const message = req.body.entry?.[0]?.changes[0]?.value?.messages?.[0];

  // check if the incoming message contains text
  if (message?.type === 'text') {
    // extract the business number to send the reply from it
    const business_phone_number_id =
      req.body.entry?.[0].changes?.[0].value?.metadata?.phone_number_id;

    // extract sender's number
    const phone = message.from;

    //extract campaign from the message
    const regex = /\[([A-Za-z0-9]{6})\]/;
    const match = message.text.body.match(regex);
    let tags = [];
    let code = match && campaigns[match[1]] ? match[1] : false;
    if (code) {
      console.log('Campaign found:', code);
      tags = [code, ...campaigns[code].tags];
    } else {
      console.log('No campaign found in the message');
    }

    // Find contact if not found add to collection.
    let contact = await contactsCollection.findOneAndUpdate(
      { phone: phone },
      { $addToSet: { tags: { $each: tags } } }
    );
    if (!contact) {
      contact = {
        _id: '',
        phone: phone,
        name: '',
        wa_name:
          req.body.entry?.[0].changes?.[0].value?.contacts?.[0].profile.name ||
          '',
        wa_id: req.body.entry?.[0].changes?.[0].value?.contacts?.[0].wa_id,
        createdBy: code || 'self',
        tags: tags,
      };
      let x = await contactsCollection.create(contact);
      contact.id = x.insertedId;
      console.log('contact created', contact);
    }

    // send a reply message as per the docs here https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
    await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`,
      headers: {
        Authorization: `Bearer ${GRAPH_API_TOKEN}`,
      },
      data: {
        messaging_product: 'whatsapp',
        to: message.from,
        text: { body: 'Echo: ' + message.text.body },
        context: {
          message_id: message.id, // shows the message as a reply to the original user message
        },
      },
    });

    // mark incoming message as read
    await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`,
      headers: {
        Authorization: `Bearer ${GRAPH_API_TOKEN}`,
      },
      data: {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: message.id,
      },
    });
  }

  res.sendStatus(200);
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

app.get('/', (req, res) => {
  res.send(`<pre>Nothing to see here.
Checkout README.md to start.</pre>`);
});

// app.listen(PORT, () => {
//   console.log(`Server is listening on port: ${PORT}`);
// });

main();
