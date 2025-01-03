/*global setTimeout, console, Promise */
import generateToken from "../../../helpers/tokenizer.js";
import { set, get, del } from "../../../helpers/storage.js";
import { BASE_URL, FLOW_KBM, FLOW_SIGNUP } from "../../../helpers/config.js";
import { isSameDate } from "../../../helpers/utils.js";
import { WELCOME } from "../../../assets/kbm_assets.js";
import { COURSES, JOIN_NOW } from "../../../assets/signup_assets.js";
import { MAX_ATTEMPTS, TERMS } from "../../../endpoint/KBM/config.js";

async function getRegistration(code, phone, coll) {
  const fields = {
    _id: 1,
    contact_id: 1,
    name: 1,
    campaign: 1,
    code: 1,
    phone: 1,
    lastAttemptedAt: 1,
    lastDayAttempts: 1,
    lastDayWins: 1,
    lastDayWinToken: 1,
    difficulty_level: 1,
    active_flow_token: 1,
    active_flow_message_id: 1
  };
  const registered = (
    await coll.read({ code, phone }, { projection: fields })
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
    difficulty_level: 0,
    lastAttemptedAt: new Date(0),
    lastDayAttempts: [],
    lastDayWins: 0
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
async function sendReminderNewDay(
  code,
  phone,
  { coll, contactsCollection, waClient, KBMreminder }
) {
  const registered = await getRegistration(code, phone, coll);
  const playButton = {
    type: "reply",
    reply: {
      id: `${code}-play`,
      title: "Play Now"
    }
  };
  const action = {
    buttons: [playButton]
  };
  if (registered) {
    const { lastAttemptedAt, lastDayAttempts, name } = registered;
    const attemptsLeft =
      MAX_ATTEMPTS - (isSameDate(lastAttemptedAt) ? lastDayAttempts.length : 0);
    if (attemptsLeft > 0) {
      const body = {
        text: ` Dear ${name}, You have ${attemptsLeft} for today. Don't forget to play and win credits.`
      };
      await waClient.sendReplyButtonMessage(phone, { body, action });
    } else {
      const contact = (
        await contactsCollection.read(
          { phone },
          {
            projection: {
              lastMessageReceivedAt: 1,
              lastTextMessageReceivedAt: 1
            }
          }
        )
      )[0];
      KBMreminder.set(
        `KBMReminder:${phone}`,
        sendReminderNewDay,
        contact.lastMessageReceivedAt,
        code,
        phone,
        { coll, contactsCollection, waClient, KBMreminder }
      );
    }
  }
}

async function sendPostGameMessage(
  registered,
  wallet,
  flow_obj,
  { coll, contactsCollection, waClient, KBMreminder }
) {
  const { won, is_sample } = flow_obj;
  const { code, phone, lastDayAttempts, lastDayWins } = registered;
  const action = {
    buttons: []
  };
  const referButton = {
    type: "reply",
    reply: {
      id: `${code}-refer`,
      title: "Refer friends"
    }
  };
  const playButton = {
    type: "reply",
    reply: {
      id: `${code}-play`,
      title: "Play Again"
    }
  };

  const email = "game.master@alchemistindia.com";
  const attemptsLeft = lastDayAttempts
    ? MAX_ATTEMPTS - lastDayAttempts.length
    : MAX_ATTEMPTS;
  const balance =
    wallet.convertible.total -
    wallet.convertible.used -
    wallet.convertible.converted;
  let body;
  if (flow_obj.is_sample) {
    body = {
      text: `You just finished a sample game with us. Play a real game now and win real credits.`
    };
  } else if (won > lastDayWins) {
    body = {
      text: `Thanks for playing. You have won ${won} credit(s) today.`
    };
  } else {
    body = {
      text: `Thanks for playing.`
    };
  }
  if (attemptsLeft) {
    console.log(`won, lastDayWins`, won, lastDayWins);
    body.text += ` You have ${attemptsLeft} attempt(s) left for today. You can win more credits if you win more than ${won > lastDayWins ? won : lastDayWins} credit(s) in your next attempt.`;
    action.buttons.push(playButton);
  } else {
    body.text += ` You have played all your ${MAX_ATTEMPTS} attempts for today and have won ${won > lastDayWins ? won : lastDayWins} credits. You can win more credits tomorrow`;
    const contact = (
      await contactsCollection.read(
        { phone },
        {
          projection: {
            lastMessageReceivedAt: 1,
            lastTextMessageReceivedAt: 1
          }
        }
      )
    )[0];
    KBMreminder.set(
      `KBMReminder:${phone}`,
      sendReminderNewDay,
      contact.lastMessageReceivedAt,
      code,
      phone,
      { coll, contactsCollection, waClient, KBMreminder }
    );
  }
  if (balance) {
    body.text += `
    Your balance is ${balance} credits. To know more / collect rewards mail to ${email} from your registered email.`;
  }

  body.text += `
  If you want your friends to _play and learn_ too, click on *_Refer friends_* below and we will send you a message with a link. Just forward it to them.`;
  action.buttons.push(referButton);
  await waClient.sendReplyButtonMessage(phone, { body, action });
}
async function sendAlreadyPlayedMessage(registered, waClient) {
  const { code, phone } = registered;
  const body = {
    text: `🥳 Hope you have enjoyed playing today's game. We will send you tomorrow's game when it becomes available so that you don't miss out. If you play daily with us you would do thousands of questions till your exam.
    Keep playing, keep learning and keep winning.

    If you want your friends to _play and learn_ too, click on *_Refer friends_* below and we will send you a message with a link. Just forward it to them.`
  };
  const action = {
    buttons: [
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
  await waClient.sendReplyButtonMessage(phone, params);
}

async function sendPlayMessage(res) {
  const { code, contact } = res.locals;
  const body = { text: `Let's play now  ${BASE_URL}/kbm` };
  const action = {
    name: "cta_url",
    parameters: {
      display_text: "Lets Play",
      url: BASE_URL + "/kbm"
    }
  };
  const params = { body, action };
  await res.locals.waClient.sendCta_urlButtonMessage(contact.phone, params);
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
      text: "SIGN UP"
    },
    body: {
      text: `Please register with your full name and email.
      These details will be verified at the time of reward collection.`
    }
  };
  const params = {
    flow_token: token,
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
  const { contact_id, code, phone } = registered;
  const { waClient, collections, KBMreminder } = res.locals;
  const {
    campaignContactsCollection,
    gameStatsCollection,
    contactsCollection
  } = collections;

  // send the KBM flow message for KBM flow_id = FLOW_KBM
  //check if there is a previously active flow token

  if (registered?.active_flow_token) {
    let flow_obj = await get(registered.active_flow_token);
    // that previous has a valid started game not yet expired or ended.
    if (new Date(flow_obj?.end_time) > new Date()) {
      waClient.sendTextMessage(
        phone,
        {
          body: `You already have a game in progress, please finish it or wait for it to expire.`
        },
        { message_id: registered.active_flow_message_id }
      );
      return;
    }
    // delete the existing flow_token
    await del(registered.active_flow_token);
  }

  // check if has already played the game today
  if (
    registered.lastAttemptedAt &&
    isSameDate(new Date(registered.lastAttemptedAt)) &&
    registered.lastDayAttempts.length >= MAX_ATTEMPTS
  ) {
    const contact = (
      await contactsCollection.read(
        { phone },
        {
          projection: { lastMessageReceivedAt: 1, lastTextMessageReceivedAt: 1 }
        }
      )
    )[0];
    KBMreminder.set(
      `KBMReminder:${phone}`,
      sendReminderNewDay,
      contact.lastMessageReceivedAt,
      code,
      phone,
      {
        coll: campaignContactsCollection,
        waClient,
        contactsCollection,
        KBMreminder
      }
    );
    await sendAlreadyPlayedMessage(registered, waClient);
  } else {
    // setup a new flow_token and make ready to send flow
    const flow_id = FLOW_KBM;
    const flow_obj = {
      campaign_contact_id: registered._id,
      contact_id,
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
        text: "Welcome to Play & Learn"
      },
      body: {
        text: `Dear ${registered.name},
        Play daily with us. It will help you learn better for your exam. You get to practice thousands of questions and get a chance to win exciting rewards.
        Happy Learning.
        
        *TEAM ALCHEMIST*`
      }
    };
    const params = {
      flow_token: token,
      flow_id,
      flow_cta: "Play Now",
      flow_action: "navigate",
      flow_action_payload: {
        screen: "WELCOME",
        data: {
          welcome_img: WELCOME.img,
          welcome_img_height: WELCOME.height,
          terms: TERMS
        }
      }
    };
    console.log("phone: ", phone);
    let response = await waClient.sendFlowMessage(phone, layout, params);
    await set(token, flow_obj);
    await campaignContactsCollection.update(
      { _id: registered._id },
      {
        $set: {
          active_flow_token: token,
          active_flow_message_id: response.messages?.[0].id
        }
      }
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
