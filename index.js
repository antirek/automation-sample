const express = require('express');
const {Queue, QueueEvents, Job} = require('bullmq');
const { v4: uuidv4 } = require('uuid');
const { inspect } = require('util');

const flows = require('./flow');
const cache = require('./cache')();

const app = express();
app.use(express.json());
const port = 3000;

const getFlow = (id) => {
  // console.log('flows', flows);
  return flows.find(item => item.id === id);
}

const getStep = (flow, stepId) => {
  if (!flow.steps) {
    console.log('no steps', flow.id)
    return;
  }
  return flow.steps.find(step => step.id === stepId);
}

const getFirstStep = (flow) => {
  const stepId = 'start';
  return getStep(flow, stepId);
}

const flowtasks = {};
cache.setConnections('test', getFlow('test').connections);

const queues = {
  validate: new Queue('validate'),
  httprequest: new Queue('httprequest'),
  log: new Queue('log'),
  select: new Queue('select'),
  email: new Queue('email'),
}

const qe = {
  validate: new QueueEvents('validate'),
  httprequest: new QueueEvents('httprequest'),
  log: new QueueEvents('log'),
  select: new QueueEvents('select'),
  email: new QueueEvents('email'),
}

const onCompleted = async job => {
  console.log('job:', job, 'completed');
  console.log('id:', job.jobId);
  console.log('return value:', job.returnvalue);

  const data = job.returnvalue;
  const flowTaskId = job.jobId.split('%')[0];
  const flowtask = flowtasks[flowTaskId];
  

  const currentStep = flowtask.currentStep;

  const next = flowtask.currentStep.next;
  if (!flowtasks[flowTaskId].logSteps) {
    flowtasks[flowTaskId].logSteps = [];
  };
  const nextStepId = next ? next(data): null;
  flowtasks[flowTaskId].logSteps.push({
    id: currentStep.id, 
    type: currentStep.type, 
    params: currentStep.params,
    input: flowtask.currentInput,
    output: data,
    nextStepId,
  });

  console.log('flowtask', inspect(flowtask,{ showHidden: true, depth: null }));
  if (!next) {
    console.log('flow end, no next step in current step');

    delete flowtasks[flowTaskId];
    console.log('current flowtasks', flowtasks);
    return;
  }
  
  console.log('nextStepId', nextStepId);
  const flow = getFlow(flowtask.flowId);
  const nextStep = getStep(flow, nextStepId);

  console.log('next step', nextStep);

  if(!nextStep) {
    console.log('flow end, no next step in flow');
    return;
  }
  
  const q = queues[nextStep.type];
  
  flowtasks[flowTaskId].currentStep = nextStep;
  flowtasks[flowTaskId].currentInput = data;
  const index = flowtasks[flowTaskId].index++;
  q.add(flowTaskId, {
    params: nextStep.params,
    data: job.returnvalue,
  }, {
    jobId: flowTaskId + '%' + index + '%' + nextStep.id,
  });
}

for (const key in qe) {
  if (qe.hasOwnProperty(key)) {
    qe[key].on('completed', onCompleted);
  }
}

app.get('/', (req, res) => {
  res.send('Hello World!')
});

app.post('/flow/:id', async (req, res) => {
  const flowTaskId = uuidv4();

  const data = req.body;
  const flowId = req.params.id;
  const flow = getFlow(flowId);
  if (!flow) {
    console.log(flowTaskId, 'no flow', flowId);
    return;
  }

  res.send(flowTaskId);

  const step = getFirstStep(flow);
  console.log(flowTaskId, 'start flow');
  console.log(flowTaskId, 'step type:', step.type);
  console.log(flowTaskId, 'data', data);

  const q = queues.validate;
  flowtasks[flowTaskId] = {
    flowId,
    currentStep: step,
    currentInput: data,
    index: 1,
    flowTaskId,
  };

  q.add(flowTaskId, {params: step.params, data}, {jobId: flowTaskId + '%' + step.id});
  console.log('flowtasks', flowtasks);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});