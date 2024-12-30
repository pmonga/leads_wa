import { BASE_URL } from "../../../../helpers/config.js";
import { timeout } from "../../../../helpers/utils.js";

export default async (req, res) => {
  const { contact, action, waClient } = res.locals;
  const link = BASE_URL + "/kbm";
  switch (action) {
    case "refer":
      await Promise.all([
        waClient.sendTextMessage(contact.phone, {
          body: `Please forward the next message to your friends`
        }),
        timeout(5000)
      ]);
      await waClient.sendTextMessage(contact.phone, {
        preview_url: false,
        body: `I enjoy learning while playing this game. You can join the fun too. Just click on the link and send the pre-filled message.
        
        ${link}`
      });
      break;
    default:
      break;
  }
};

/*global console, setTimeout, Promise*/
