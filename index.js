import express from 'express';
import axios from 'axios';
import MongoClient from 'mongodb';
import 'dotenv/config';
import { connect } from './db.js';
import crud from './crud.js'; // Import the CRUD module
import createWhatsAppClient from './whatsappCloudAPI.js';

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
  log.create({ ...req.body });
  //console.log('Incoming webhook message:', JSON.stringify(req.body, null, 2));

  // check if the webhook request contains a message
  // details on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
  const message = req.body.entry?.[0]?.changes[0]?.value?.messages?.[0];

  // check if the incoming message contains text
  if (message?.type === 'text') {
    // extract the business number to send the reply from it
    const business_phone_number_id =
      req.body.entry?.[0].changes?.[0].value?.metadata?.phone_number_id;
    const waClient = createWhatsAppClient(business_phone_number_id);
    // extract sender's number and validate its from India else return, no more processing
    const phone = message.from;
    let mobile;
    if (/^91/.test(phone)) {
      mobile = phone.slice(2);
    } else {
      res.sendStatus(200);
      return 'Not a valid Indian mobile';
    }

    //extract campaign from the message
    const campaignRegex = /\[([A-Za-z0-9]{6})\]/;
    const match = message.text.body.match(campaignRegex);
    let campaignTags = ['self'];
    let utm = { utm_source: 'self' };
    let reply =
      'Thank you for contacting Alchemist, we will get in touch with you soon';
    let code = match && campaigns[match[1]] ? match[1] : false;
    if (code) {
      console.log('Campaign found:', code);
      campaignTags = [code, ...campaigns[code].tags];
      utm = { ...campaigns[code].utm };
      if (campaigns[code].reply) reply = campaigns[code].reply;
    } else {
      console.log('No campaign found in the message');
    }

    // Find contact if not found add to collection.
    let contact = (await contactsCollection.read({ phone: phone }))?.[0];
    if (contact) {
      contactsCollection.update(
        { phone: phone },
        { $addToSet: { tags: { $each: campaignTags } } }
      );
    } else {
      contact = {
        phone: phone,
        mobile: mobile,
        email: '',
        name: '',
        wa_name:
          req.body.entry?.[0].changes?.[0].value?.contacts?.[0].profile.name ||
          '',
        wa_id: req.body.entry?.[0].changes?.[0].value?.contacts?.[0].wa_id,
        createdBy: code || 'self',
        tags: campaignTags,
      };
      let x = await contactsCollection.create(contact);
      contact._id = x.insertedId;
    }

    // save the message in the wa_messages and create an entry in CRM
    messagesCollection.create({
      contact_id: contact._id,
      message_object: { ...req.body },
    });
    let response = await axios({
      method: 'POST',
      url: `https://admin.schedule.alchemistindia.com/cp2/schedule/apis/contact`,
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        source: 'whatsApp LP',
        first_name: contact.name,
        mobile: contact.mobile,
        email: contact.email,
        wa_name: contact.wa_name,
        message: message.text.body,
        ...utm,
      },
    });
    console.log(response.data);

    // send a reply message as per the docs here https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
    await waClient.sendTextMessage(message.from, {
      body: reply + '(sent by module)',
    });
    // await axios({
    //   method: 'POST',
    //   url: `https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`,
    //   headers: {
    //     Authorization: `Bearer ${GRAPH_API_TOKEN}`,
    //   },
    //   data: {
    //     messaging_product: 'whatsapp',
    //     to: message.from,
    //     text: {
    //       body: reply,
    //     },
    //   },
    // });

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
