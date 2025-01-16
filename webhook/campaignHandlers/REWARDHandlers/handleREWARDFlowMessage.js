const handleREWARDFlowMessage = async function (req, res) {
  const upiIdRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  const { contact, flow_data, flow_obj, collections, waClient } = res.locals;
  const { payers, ledgerCollection } = collections;
  const { name, phone, wallet, fieldsToUpdate } = contact;
  const { total, used, converted } = wallet.convertible;
  const { amount } = flow_data;
  let upi = contact.upi;
  if (!upi) {
    if (!flow_data.upi || !upiIdRegex.test(flow_data.upi)) {
      await waClient.sendTextMessage(phone, {
        body: `Missing valid UPI ID. Please try again with a valid UPI ID`
      });
      return;
    } else {
      upi = flow_data.upi;
      fieldsToUpdate.upi = upi;
    }
  }
  if (amount > 0 && amount <= total - used - converted) {
    const payer = (await payers.read({ is_active: true }))?.[0];
    if (!payer) {
      await waClient.sendTextMessage(phone, {
        body: `Something went wrong, please try again later.`
      });
      console.warn("PAYER Error: No active payer found");
    }
    const type = "convertible";
    const changes = { converted: amount };
    const description = `${upi}-${amount}-reward claimed`;
    const entry = { type, changes, description, flow_obj };
    for (const k in changes) {
      wallet[type][k] += changes[k];
    }
    fieldsToUpdate.wallet = wallet;
    const ledger_id = (
      await ledgerCollection.create({
        contact_id: contact._id,
        phone,
        name,
        entry,
        status: "pending"
      })
    ).insertedId;
    const payButton = {
      type: "reply",
      reply: {
        id: `REWARD-pay-${ledger_id}`,
        title: "Pay Now"
      }
    };
    const denyButton = {
      type: "reply",
      reply: {
        id: `REWARD-deny-${ledger_id}`,
        title: "Deny Reward"
      }
    };
    const action = { buttons: [payButton, denyButton] };
    const body = {
      text: `Payout Requested
1. **Name:** ${name}
2. **Phone:** ${phone}
3. **Total:** ${total}
4. **Converted:** ${converted}
5. **Used:** ${used}
6. **Balance:** ${total - converted - used}
7. **Amount Requested: ${amount}`
    };
    await waClient.sendReplyButtonMessage(payer.phone, {
      body,
      action
    });
    await waClient.sendTextMessage(phone, {
      body: `Your request has been submitted`
    });
  }
};
export default handleREWARDFlowMessage;
/* globals console */
