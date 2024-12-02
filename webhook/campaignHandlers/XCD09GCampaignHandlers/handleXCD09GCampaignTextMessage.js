import dotnenv from 'dotenv';
import generateToken from '../../../helpers/tokenizer.js';
import { set, get, del } from '../../../helpers/storage.js';

dotnenv.config();
export default async (req, res, next) => {
  const GAME_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds

  const message = res.locals.message;
  const contact = res.locals.contact;
  const code = res.locals.code; // should be 'XCD09G';
  const campaign = res.locals.campaign;
  const phone = contact.phone;
  const contactsCollection = res.locals.collections.contactsCollection;
  const campaignsCollection = res.locals.collections.campaignsCollection;
  const campaignContactsCollection =
    res.locals.collections.campaignContactsCollection;

  // check if contact has already provided name && registered for the game;
  if (contact.name) {
    let registered = (
      await campaignContactsCollection.read(
        { code, phone },
        {
          projection: {
            _id: 1,
            name: 1,
            code: 1,
            phone: 1,
            last_attemptedAt: 1,
            last_attempt_level: 1,
            active_flow_token: 1,
          },
        }
      )
    )?.[0];
    // if not registered then register now
    if (!registered) {
      registered = {
        campaign_id: campaign._id,
        code,
        contact_id: contact._id,
        name: contact.name,
        phone,
        mobile: contact.mobile,
      };
      registered._id = (
        await campaignContactsCollection.create(registered)
      ).insertedId;
      let reply = {
        body: `Thank you, ${
          registered.name
        }, you are registered for ${campaign.name.toUpperCase()} with mobile number ${
          registered.phone
        }`,
      };
      res.locals.waClient.sendTextMessage(contact.phone, reply);
    }
    // send the KBM flow message for KBM flow_id = 1214667192982073
    // check if has already played the game today
    if (
      registered.last_attemptedAt &&
      isSameDate(new Date(registered.last_attemptedAt))
    ) {
      res.locals.waClient.sendTextMessage(contact.phone, {
        body: `You have already played the game today. Please try again tomorrow `,
      });
    } else {
      //check if there is a previously active flow token
      if (registered?.active_flow_token) {
        const flow_obj = await get(registered.active_flow_token);
        // that previous has a valid started game not yet expired or ended.
        if (
          flow_obj?.startedAt &&
          isWithinAllowedPeriod(flow_obj.startedAt, GAME_TIME)
        ) {
          res.locals.waClient.sendTextMessage(contact.phone, {
            body: `You already have a game in progress, please finish it or wait for it to expire.`,
          });
          res.locals.waClient.sendStatusUpdate('read', message);
          res.sendStatus(200);
          return;
        }
        // delete the existing flow_token
        await del(registered.active_flow_token);
      }
      // setup a new flow_token and make ready to send flow
      const flow_id = '1214667192982073';
      const flow_obj = { phone, code, flow_id, createdAt: new Date() };
      const token = generateToken(JSON.stringify(flow_obj));
      const layout = {
        header: {
          type: 'text',
          text: 'Flow message header',
        },
        body: {
          text: 'Flow message body',
        },
        footer: {
          text: 'Flow message footer',
        },
      };
      const params = {
        flow_token: token,
        mode: 'draft',
        flow_id, //KBM
        flow_cta: 'Play Now',
        flow_action: 'navigate',
        flow_action_payload: {
          screen: 'WELCOME',
        },
      };
      await res.locals.waClient.sendFlowMessage(contact.phone, layout, params);
      await set(token, flow_obj);
      await campaignContactsCollection.update(
        { _id: registered._id },
        { $set: { active_flow_token: token } }
      );
    }
  } else {
    // send Sign Up flow message here
    // to get the contact's name
    const token = generateToken(
      JSON.stringify({ phone, code, flow_id: '1760272798116365' })
    );
    const layout = {
      header: {
        type: 'text',
        text: 'Flow message header',
      },
      body: {
        text: 'Flow message body',
      },
      footer: {
        text: 'Flow message footer',
      },
    };
    const params = {
      flow_token: token,
      mode: 'draft',
      flow_id: '1760272798116365', //Lead Sign Up
      flow_cta: 'Register',
      flow_action: 'navigate',
      flow_action_payload: {
        screen: 'JOIN_NOW',
      },
    };
    await res.locals.waClient.sendFlowMessage(contact.phone, layout, params);
    await set(token, {
      flow_token: token,
      phone,
      code,
      flow_id: '1760272798116365',
      created: new Date(),
    });
  }
};

function isSameDate(givenDate) {
  // Get the current date in IST
  const currentDate = new Date();
  const istOffset = 330; // IST is UTC+5:30
  const istCurrentDate = new Date(
    currentDate.getTime() +
      currentDate.getTimezoneOffset() * 60000 +
      istOffset * 60000
  );

  // Adjust the given date to IST
  const istGivenDate = new Date(
    givenDate.getTime() +
      givenDate.getTimezoneOffset() * 60000 +
      istOffset * 60000
  );

  // Compare year, month, and day
  return (
    istCurrentDate.getFullYear() === istGivenDate.getFullYear() &&
    istCurrentDate.getMonth() === istGivenDate.getMonth() &&
    istCurrentDate.getDate() === istGivenDate.getDate()
  );
}

/**
 * Checks if the current time is within the allowed period from the start time.
 * @param {Date|string} startTime - The starting time as a Date object or a valid date string.
 * @param {number} allowedPeriod - The allowed period in milliseconds.
 * @returns {boolean} - True if the current time is within the allowed period, false otherwise.
 */
function isWithinAllowedPeriod(startTime, allowedPeriod) {
  // Ensure startTime is a Date object
  const start = new Date(startTime);

  // Check for invalid start time
  if (isNaN(start)) {
    throw new Error('Invalid start time provided');
  }

  // Get the current time
  const currentTime = new Date();

  // Calculate the difference in time
  const timeDifference = currentTime - start;

  // Check if the difference is within the allowed period
  return timeDifference <= allowedPeriod;
}
