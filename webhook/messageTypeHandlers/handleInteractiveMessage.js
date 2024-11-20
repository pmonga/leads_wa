import handleFlowMessage from './interactiveTypeHandlers/handleFlowMessage';

const handleInteractiveMessage = async function (req, res) {
  const type = res.locals.message.interactive.type;
  switch (type) {
    case 'nfm_reply':
      handleFlowMessage(req, res);
      break;
    default:
      console.log('Not supported Interactive message type: ', type);
      res.sendStatus(200);
      break;
  }
};

export default handleInteractiveMessage;
