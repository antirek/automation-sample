const { Worker, Job } = require('bullmq');

const worker = new Worker('httprequest', async job => {  
  console.log('job data', job.data);
  return {
    status: 'success', 
    data: {
      title: 'amazing',
    }
  };
});

worker.on('completed', (job) => {
  console.log(`${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.log(`${job.id} has failed with ${err.message}`);
});