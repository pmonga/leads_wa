import generateToken from "../../../helpers/tokenizer.js";
import { set, get, del } from "../../../helpers/storage.js";
import { FLOW_KBM, FLOW_SIGNUP } from "../../../helpers/config.js";
import { isSameDate } from "../../../helpers/utils.js";
import { WELCOME } from "../../../assets/kbm_assets.js";
import { COURSES, JOIN_NOW } from "../../../assets/signup_assets.js";

async function getRegistration(res) {
  const { code, contact } = res.locals;
  const coll = res.locals.collections.campaignContactsCollection;
  const fields = {
    _id: 1,
    name: 1,
    campaign: 1,
    code: 1,
    phone: 1,
    last_attemptedAt: 1,
    difficulty_level: 1,
    active_flow_token: 1
  };
  const registered = (
    await coll.read({ code, phone: contact.phone }, { projection: fields })
  )?.[0];
  return registered;
}

async function register(res) {
  const { campaign, contact } = res.locals;
  const coll = res.locals.collections.campaignContactsCollection;
  const registered = {
    campaign_id: campaign._id,
    code: campaign.code,
    campaign: campaign.name,
    contact_id: contact._id,
    name: contact.name,
    phone: contact.phone,
    mobile: contact.mobile,
    difficulty_level: 0
  };
  registered._id = (await coll.create(registered)).insertedId;
  return registered;
}

async function sendRegistrationMessage(registered, res) {
  const reply = {
    body: `Thank you, ${
      registered.name
    }, you are registered for ${registered.campaign.toUpperCase()} with mobile number ${
      registered.phone
    }.`
  };
  await res.locals.waClient.sendTextMessage(registered.phone, reply);
}

async function sendPostGameMessage(registered, wallet, res) {
  const { contact, flow_obj } = res.locals;
  let reply;
  if (flow_obj.won) {
    reply = {
      body: `Thanks for playing. You won ${flow_obj.won} credits. Your balance is ${wallet.convertible.total - wallet.convertible.used - wallet.convertible.converted}. To know more / collect rewards mail to game.master@alchemistindia.com from your registered email.`
    };
  } else {
    reply = {
      body: `Thanks for playing. Your balance is ${wallet.convertible.total - wallet.convertible.used - wallet.convertible.converted} credits.To know more / collect rewards mail to game.master@alchemistindia.com from your registered email.`
    };
  }
  await res.locals.waClient.sendTextMessage(registered.phone, reply);
}
async function sendAlreadyPlayedMessage(res) {
  const { code, contact } = res.locals;
  const body = {
    text: `#You \n
     have already played the game today :sweat:. 
     Please try again tomorrow.
      -Click on ==*Remind Me*== to set up a reminder and we will update you when the game becomes available.
      -Click on *Refer friends* to generate a referral link and forward it to your friends who may also enjoy playing.`
  };
  const action = {
    buttons: [
      {
        type: "reply",
        reply: {
          id: `${code}-reminder`,
          title: "Remind Me"
        }
      },
      {
        type: "reply",
        reply: {
          id: `${code}-refer`,
          title: "Refer friends"
        }
      }
    ]
  };
  const params = { body, action };
  await res.locals.waClient.sendReplyButtonMessage(contact.phone, params);
}
async function sendSignUpFlow(res) {
  // send Sign Up flow message here
  // to get the contact's name
  const { code } = res.locals;
  const phone = res.locals.contact.phone;

  const token = generateToken(
    JSON.stringify({ phone, code, flow_id: FLOW_SIGNUP })
  );
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
    flow_id: FLOW_SIGNUP, //Lead Sign Up
    flow_cta: "Register",
    flow_action: "navigate",
    flow_action_payload: {
      screen: "JOIN_NOW",
      data: {
        join_now_img: JOIN_NOW.img,
        join_now_img_height: JOIN_NOW.height,
        courses_img: COURSES.img,
        courses_img_height: COURSES.height,
        courses: [
          {
            id: "cat25",
            title: "CAT 25"
          },
          {
            id: "omet25",
            title: "OMETs (XAT, NMAT etc)"
          },
          {
            id: "gmat25",
            title: "GMAT"
          }
        ]
      }
    }
  };
  await res.locals.waClient.sendFlowMessage(phone, layout, params);
  await set(token, {
    flow_token: token,
    phone,
    code,
    flow_id: FLOW_SIGNUP,
    created: new Date()
  });
}
async function sendKBMFlow(registered, res) {
  const code = res.locals.code;
  const contact = res.locals.contact;
  const phone = contact.phone;
  const { campaignContactsCollection, gameStatsCollection } =
    res.locals.collections;

  // send the KBM flow message for KBM flow_id = FLOW_KBM
  // check if has already played the game today
  if (
    code ||
    (registered.last_attemptedAt &&
      isSameDate(new Date(registered.last_attemptedAt)))
  ) {
    await sendAlreadyPlayedMessage(res);
  } else {
    //check if there is a previously active flow token
    if (registered?.active_flow_token) {
      let flow_obj = await get(registered.active_flow_token);
      // that previous has a valid started game not yet expired or ended.
      if (new Date(flow_obj?.end_time) > new Date()) {
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
    const flow_obj = {
      campaign_contact_id: registered._id,
      phone,
      code,
      flow_id,
      difficulty_level: registered.difficulty_level,
      createdAt: new Date()
    };
    const token = generateToken(JSON.stringify(flow_obj));
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
        screen: "WELCOME",
        data: { welcome_img: WELCOME.img, welcome_img_height: WELCOME.height }
      }
    };
    await res.locals.waClient.sendFlowMessage(contact.phone, layout, params);
    await set(token, flow_obj);
    await campaignContactsCollection.update(
      { _id: registered._id },
      { $set: { active_flow_token: token } }
    );
    await gameStatsCollection.create({
      flow_token: token,
      ...flow_obj
    });
  }
}

export {
  getRegistration,
  register,
  sendRegistrationMessage,
  sendPostGameMessage,
  sendSignUpFlow,
  sendKBMFlow
};
