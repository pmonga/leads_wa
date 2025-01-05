import { signUp } from "../../../../flows/flowSignUpFunctions.js";
import { FLOW_SIGNUP } from "../../../../helpers/config.js";
import { isOfficeOpen } from "../../../../helpers/utils.js";
import { getRegistration } from "../../XCD09GCampaignHandlers/handlerFunctions.js";
import {
  playButton,
  tryMBAGameButton,
  callBackButton,
  vcButton
} from "../common.js";

const handleDefaultCampaignFlowMessage = async function (req, res) {
  const { code, contact, flow_obj, waClient, collections } = res.locals;

  if (flow_obj.flow_id === FLOW_SIGNUP) {
    const body = { text: "" };
    const action = { buttons: [] };
    await signUp(res);
    const { phone, name } = contact;
    switch (code) {
      case "VIDCON": {
        if (isOfficeOpen("10:30", "18:30")) {
          body.text =
            "We have received your request and we will soon contact you with zoom meeting details.";
        } else {
          body.text =
            "Sorry our office is closed right now. We will contact you when it opens.";
        }
        const registered = await getRegistration(
          "XCD09G",
          phone,
          collections.campaignContactsCollection
        );
        if (registered) {
          body.text += `
         Meanwhile why don't you play a game`;
          action.buttons = [playButton];
        } else {
          body.text += `
         Meanwhile why don't you try our MBA game`;
          action.buttons = [tryMBAGameButton];
        }
        await waClient.sendReplyButtonMessage(phone, { body, action });
        break;
      }
      case "RQCALL":
        {
          if (isOfficeOpen("10:30", "18:30")) {
            body.text =
              "We have received your request and we will soon call you.";
          } else {
            body.text =
              "Sorry our office is closed right now. We will contact you when it opens.";
          }
          const registered = await getRegistration(
            "XCD09G",
            phone,
            collections.campaignContactsCollection
          );
          if (registered) {
            body.text += `
Meanwhile why don't you play a game`;
            action.buttons = [playButton];
          } else {
            body.text += `
Meanwhile why don't you try our MBA game`;
            action.buttons = [tryMBAGameButton];
          }
          await waClient.sendReplyButtonMessage(phone, { body, action });
        }
        break;
      default: {
        const registered = await getRegistration(
          "XCD09G",
          phone,
          collections.campaignContactsCollection
        );
        body.text = `Thank you for your details, what will you like to do next?
1. Request a call back (10:30-6:30)
2. Take a counselling on Zoom (10:30-6:30)`;
        if (registered) {
          body.text += `
3. Play the game`;
          action.buttons = [callBackButton, vcButton, playButton];
        } else {
          body.text += `
3. Try our game for MBA`;
          action.buttons = [callBackButton, vcButton, tryMBAGameButton];
        }

        await waClient.sendReplyButtonMessage(phone, { body, action });
        break;
      }
    }
  }
};

export default handleDefaultCampaignFlowMessage;
