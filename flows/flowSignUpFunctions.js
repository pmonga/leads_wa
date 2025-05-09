import { REFERRAL_AMOUNT } from "../helpers/config.js";

async function signUp(res) {
  const { contact, flow_data, waClient } = res.locals;
  const { contactsCollection, ledgerCollection } = res.locals.collections;
  if (!contact.name) {
    contact.name = flow_data.name.trim();
    contact.email = flow_data.email.trim();
    const { phone, name, email } = contact;
    if (contact.referredBy) {
      creditReferralAmount(contact.referredBy);
    }
    await contactsCollection.update({ phone }, { $set: { name, email } });
  }

  // addTags
  contact.tagsToAdd = contact.tagsToAdd.concat(flow_data.courses);

  // Referral Credit Add function
  async function creditReferralAmount(phone) {
    console.log("Test for referral: ", phone);
    const ref = await contactsCollection.read({ phone })?.[0];
    if (ref) {
      const { wallet } = ref;
      const entries = [
        {
          type: "convertible",
          changes: { total: REFERRAL_AMOUNT },
          description: `Referral Amount Credit for ${contact.phone}`
        }
      ];
      for (const entry of entries) {
        const { type, changes } = entry;
        for (const k in changes) {
          wallet[type][k] += changes[k];
        }
        await ledgerCollection.create({
          contact_id: ref._id,
          phone: ref.phone,
          name: ref.name,
          entry,
          status: "completed"
        });
      }
      await contactsCollection.update(
        { phone },
        {
          $set: wallet
        }
      );

      if (
        new Date() - new Date(ref.lastMessageReceivedAt) <
        (24 * 60 * 60 - 1) * 1000
      ) {
        const balance =
          wallet.convertible.total -
          wallet.convertible.used -
          wallet.convertible.converted;
        const referButton = {
          type: "reply",
          reply: {
            id: `XCD09G-refer`,
            title: "Refer friends"
          }
        };
        const claimButton = {
          type: "reply",
          reply: {
            id: `REWARD-claim`,
            title: "Claim Reward"
          }
        };
        const action = {
          buttons: [claimButton, referButton]
        };
        const body = {
          text: `${contact.name} @ ${contact.phone} has just registered with your reference.
An amount of ${REFERRAL_AMOUNT} credits have been added to your wallet.
Your balance is ${balance} credits.
To collect reward click on *_Claim Reward _* and the fill the request form.

If you want to refer more friends and earn ${REFERRAL_AMOUNT} credit per successful referral, click on *_Refer friends_* below and we will send you a message with a link. Just forward it to them.`
        };
        const params = { body, action };
        await waClient.sendReplyButtonMessage(phone, params);
      }
    }
  }
}

export { signUp };
/*globals console*/
