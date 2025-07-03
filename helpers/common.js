import { interpolateString } from "./utils.js";

const broadcast = async function (message, waClient, contactsCollection) {
  if (!(typeof message === "string" || message instanceof String) || !message) {
    return { sussess: false, error: "message should be a valid string" };
  }
  const contacts = await contactsCollection.read(
    {
      lastMessageReceivedAt: {
        $gt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    },
    { projection: { phone: 1, name: 1 } }
  );
  let promises = [];
  contacts.forEach((e) => {
    promises = promises.concat(
      waClient.sendTextMessage(e.phone, {
        preview_url: true,
        body: interpolateString(message, e)
      })
    );
  });
  try {
    await Promise.all(promises);
    return {
      success: true,
      message: `Sent broadcast to ${promises.length} numbers at ${new Date().toISOString()}`
    };
  } catch (err) {
    console.warn("error in broadcast: ", err);
    return {
      success: false,
      error: err
    };
  }
};
export { broadcast };
/* globals Promise console */
