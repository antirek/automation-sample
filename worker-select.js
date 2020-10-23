const { Worker, Job } = require('bullmq');
const cache = require('./cache')();

const worker = new Worker('select', async job => {
  console.log('job data', job.data);

  return 'test';
});

worker.on('completed', (job) => {
  console.log(`${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.log(`${job.id} has failed with ${err.message}`);
});