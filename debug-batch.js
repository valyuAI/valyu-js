#!/usr/bin/env node

const { Valyu } = require('./dist/index.js');

const API_KEY = process.env.VALYU_API_KEY;
const BASE_URL = 'https://api.valyu.ai/v1';

const client = new Valyu(API_KEY, BASE_URL);

async function debug() {
  console.log('Creating batch...');
  const createResponse = await client.batch.create({
    name: 'Debug Batch',
  });
  console.log('Create response:', JSON.stringify(createResponse, null, 2));

  if (!createResponse.success) {
    console.error('Failed to create batch');
    return;
  }

  const batchId = createResponse.batch_id;
  console.log('\nGetting status...');
  const statusResponse = await client.batch.status(batchId);
  console.log('Status response:', JSON.stringify(statusResponse, null, 2));

  console.log('\nAdding tasks...');
  const addResponse = await client.batch.addTasks(batchId, {
    tasks: [
      { input: 'Test question 1' },
      { input: 'Test question 2' }
    ]
  });
  console.log('Add tasks response:', JSON.stringify(addResponse, null, 2));

  console.log('\nGetting status again...');
  const statusResponse2 = await client.batch.status(batchId);
  console.log('Status response 2:', JSON.stringify(statusResponse2, null, 2));

  console.log('\nListing tasks...');
  const listTasksResponse = await client.batch.listTasks(batchId);
  console.log('List tasks response:', JSON.stringify(listTasksResponse, null, 2));

  console.log('\nCancelling batch...');
  await client.batch.cancel(batchId);
}

debug();
