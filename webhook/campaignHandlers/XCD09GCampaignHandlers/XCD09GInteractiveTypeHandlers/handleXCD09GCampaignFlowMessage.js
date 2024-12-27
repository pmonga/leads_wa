import dotnenv from "dotenv";
import generateToken from "../../../../helpers/tokenizer.js";
import { set, get, del } from "../../../../helpers/storage.js";
import { FLOW_KBM, FLOW_SIGNUP } from "../../../../helpers/config.js";
import { isSameDate } from "../../../../helpers/utils.js";

dotnenv.config();
export default async (req, res) => {
  const code = res.locals.code;
  const campaign = res.locals.campaign;
  const contact = res.locals.contact;

  const contactsCollection = res.locals.collections.contactsCollection;
  const campaignsCollection = res.locals.collections.campaignsCollection;
  const campaignContactsCollection =
    res.locals.collections.campaignContactsCollection;

  const flow_data = res.locals.flow_data;
  const flow_token = res.locals.flow_token;
  const flow_obj = res.locals.flow_obj;
  if (flow_obj.phone != contact.phone) {
    let reply = {
      body: "Sorry, Incorrect parameters. Please try again later."
    };
    await del(res.locals.flow_token);
    await res.locals.waClient.sendTextMessage(contact.phone, reply);
    return;
  }
  switch (flow_obj.flow_id) {
    case FLOW_SIGNUP: {
      //sign up -- enter contact name and email if not already done earlier
      if (!contact.name) {
        contact.name = flow_data.name;
        contact.email = flow_data.email;
        await signUp(contact, contactsCollection);
      }
      // get registration details
      let registered = await getRegistration(
        campaign,
        contact,
        campaignContactsCollection
      );
      // if not registered; register for the Campaign
      if (!registered) {
        registered = await register(
          campaign,
          contact,
          campaignContactsCollection
        );
      }
      //send wa reply to contact
      if (registered) {
        let reply = {
          body: `Thank you, ${
            registered.name
          }, you are registered for ${campaign.name.toUpperCase()} with mobile number ${
            registered.phone
          }.`
        };
        await res.locals.waClient.sendTextMessage(contact.phone, reply);
        // send KBM flow
        await sendKBMFlow(registered, res);
      } else {
        await res.locals.waClient.sendTextMessage(contact.phone, {
          body: `Sorry something went wrong, please try again later`
        });
      }
      break;
    }
    case FLOW_KBM: {
      // get registration details
      const registered = await getRegistration(
        campaign,
        contact,
        campaignContactsCollection
      );
      if (registered) {
        const flow_obj = res.locals.flow_obj;
        const { difficulty_level, cur } = { flow_obj };
        if (cur > 10) {
          await campaignContactsCollection.update(
            { _id: registered._id },
            { $set: { difficulty_level: difficulty_level + 1 } }
          );
        }
        const { ledgerCollection } = res.locals.collections;
        const wallet = { ...res.locals.contact.wallet };
        if (flow_obj?.entry) {
          const { type, changes } = flow_obj.entry;
          for (const k in changes) {
            wallet[type][k] += changes[k];
          }
          res.locals.contact.fieldsToUpdate.wallet = wallet;
          await ledgerCollection.create({
            contact_id: contact._id,
            phone: contact.phone,
            name: contact.name,
            entry: flow_obj?.entry
          });
          await res.locals.waClient.sendTextMessage(contact.phone, {
            body: `Thanks for playing. You won ${flow_obj.won}. Your balance is ${wallet.convertible.total - wallet.convertible.used - wallet.convertible.converted}. To know more / collect rewards mail to game.master@alchemistindia.com from your registered email.`
          });
        } else {
          await res.locals.waClient.sendTextMessage(contact.phone, {
            body: `Thanks for playing. Your balance is ${wallet.convertible.total - wallet.convertible.used - wallet.convertible.converted}.To know more / collect rewards mail to game.master@alchemistindia.com from your registered email.`
          });
        }
      }
      break;
    }
  }
  // clean up, remove the token
  del(res.locals.flow_token);
};

async function signUp(contact, collection) {
  const { phone, name, email } = contact;
  await collection.update({ phone }, { $set: { name, email } });
  return;
}

async function getRegistration(campaign, contact, coll) {
  const fields = {
    _id: 1,
    name: 1,
    code: 1,
    phone: 1,
    last_attemptedAt: 1,
    difficulty_level: 1,
    active_flow_token: 1
  };
  const registered = (
    await coll.read(
      { code: campaign.code, phone: contact.phone },
      { projection: fields }
    )
  )?.[0];
  return registered;
}

async function register(campaign, contact, coll) {
  const registered = {
    campaign_id: campaign._id,
    code: campaign.code,
    contact_id: contact._id,
    name: contact.name,
    phone: contact.phone,
    mobile: contact.mobile,
    difficulty_level: 0
  };
  registered._id = (await coll.create(registered)).insertedId;
  return registered;
}

async function sendKBMFlow(registered, res) {
  const code = res.locals.code;
  const contact = res.locals.contact;
  const phone = contact.phone;
  const campaignContactsCollection =
    res.locals.collections.campaignContactsCollection;

  // send the KBM flow message for KBM flow_id = FLOW_KBM
  // check if has already played the game today
  if (
    registered.last_attemptedAt &&
    isSameDate(new Date(registered.last_attemptedAt))
  ) {
    await res.locals.waClient.sendTextMessage(contact.phone, {
      body: `You have already played the game today. Please try again tomorrow `
    });
  } else {
    //check if there is a previously active flow token
    if (registered?.active_flow_token) {
      let kbm_flow_obj = await get(registered.active_flow_token);
      // that previous has a valid started game not yet expired or ended.
      if (new Date(kbm_flow_obj?.end_time) > new Date()) {
        res.locals.waClient.sendTextMessage(contact.phone, {
          body: `You already have a game in progress, please finish it or wait for it to expire.`
        });
        return;
      }
      // delete the existing flow_token
      await del(registered.active_flow_token);
    }
    // setup a new flow_token and make ready to send flow
    const flow_id = FLOW_KBM;
    const kbm_flow_obj = {
      campaign_contact_id: registered._id,
      phone,
      code,
      flow_id,
      difficulty_level: registered.difficulty_level,
      createdAt: new Date()
    };
    const token = generateToken(JSON.stringify(kbm_flow_obj));
    const layout = {
      header: {
        type: "text",
        text: "Flow message header"
      },
      body: {
        text: "Flow message body"
      },
      footer: {
        text: "Flow message footer"
      }
    };
    const params = {
      flow_token: token,
      mode: "draft",
      flow_id, //KBM
      flow_cta: "Play Now",
      flow_action: "navigate",
      flow_action_payload: {
        screen: "WELCOME"
      }
    };
    await res.locals.waClient.sendFlowMessage(contact.phone, layout, params);
    await set(token, kbm_flow_obj);
    await campaignContactsCollection.update(
      { _id: registered._id },
      { $set: { active_flow_token: token } }
    );
  }
}
/*global console*/
