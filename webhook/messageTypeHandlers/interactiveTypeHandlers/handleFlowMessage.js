// Inbound Flow message handler
//import handleFlowMessage from './interactiveTypeHandlers/handleFlowMessage';

const handleFlowMessage = async function (req, res) {
  const flow = 'test'; // write code to find flow.id or flow.name from flow_token
  switch (flow) {
    case 'default':
      console.log('Not supported flow: ', flow);
      res.sendStatus(200);
      break;
  }
};

export default handleFlowMessage;
