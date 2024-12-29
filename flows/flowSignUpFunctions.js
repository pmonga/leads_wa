async function signUp(res) {
  const { contact, flow_data } = res.locals;
  const { contactsCollection } = res.locals.collection;
  if (!contact.name) {
    contact.name = flow_data.name;
    contact.email = flow_data.email;
    const { phone, name, email } = contact;
    await contactsCollection.update({ phone }, { $set: { name, email } });
  }
  // addTags
  contact.tagsToAdd = contact.tagsToAdd.concat(flow_data.courses);
}

export { signUp };
