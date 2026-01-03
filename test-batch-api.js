#!/usr/bin/env node

/**
 * Comprehensive Batch API Test Script
 * Tests all batch methods against stage environment
 */

const { Valyu } = require('./dist/index.js');

// Configuration
const API_KEY = process.env.VALYU_API_KEY;
const BASE_URL = 'https://api.valyu.ai/v1';

// Initialize client
const client = new Valyu(API_KEY, BASE_URL);

// Test results tracker
const results = {
  passed: [],
  failed: []
};

function logTest(name, success, details = '') {
  const status = success ? '✓' : '✗';
  console.log(`${status} ${name}`);
  if (details) {
    console.log(`  ${details}`);
  }
  if (success) {
    results.passed.push(name);
  } else {
    results.failed.push({ name, details });
  }
}

async function runTests() {
  console.log('=== Batch API Test Suite ===\n');
  console.log(`Environment: ${BASE_URL}\n`);

  let batchId;

  try {
    // Test 1: Create a new batch
    console.log('Test 1: batch.create()');
    const createResponse = await client.batch.create({
      name: 'SDK Test Batch',
      model: 'lite',
      outputFormats: ['markdown'],
      metadata: { test: 'sdk-test', timestamp: new Date().toISOString() }
    });

    if (createResponse.success && createResponse.batch_id) {
      batchId = createResponse.batch_id;
      logTest('batch.create()', true, `Created batch: ${batchId}`);
    } else {
      logTest('batch.create()', false, createResponse.error || 'No batch_id returned');
      throw new Error('Failed to create batch');
    }

    // Test 2: Get batch status (empty batch)
    console.log('\nTest 2: batch.status() - empty batch');
    const emptyStatusResponse = await client.batch.status(batchId);

    if (emptyStatusResponse.success && emptyStatusResponse.batch) {
      const batch = emptyStatusResponse.batch;
      const isValid = batch.batch_id === batchId &&
                     batch.status === 'pending' &&
                     batch.counts.total === 0;
      logTest('batch.status() - empty', isValid,
        `Status: ${batch.status}, Total: ${batch.counts.total}`);
    } else {
      logTest('batch.status() - empty', false, emptyStatusResponse.error);
    }

    // Test 3: Add tasks to batch
    console.log('\nTest 3: batch.addTasks()');
    const addTasksResponse = await client.batch.addTasks(batchId, {
      tasks: [
        { input: 'What is the capital of France?' },
        { input: 'Explain quantum computing in simple terms' },
        { input: 'List the top 5 programming languages in 2024' }
      ]
    });

    if (addTasksResponse.success && addTasksResponse.added_count === 3) {
      logTest('batch.addTasks()', true, `Added ${addTasksResponse.added_count} tasks`);
    } else {
      logTest('batch.addTasks()', false,
        addTasksResponse.error || `Expected 3 tasks, got ${addTasksResponse.added_count}`);
    }

    // Test 4: Get batch status (with tasks)
    console.log('\nTest 4: batch.status() - with tasks');
    const statusResponse = await client.batch.status(batchId);

    if (statusResponse.success && statusResponse.batch) {
      const batch = statusResponse.batch;
      const isValid = batch.counts.total === 3;
      logTest('batch.status() - with tasks', isValid,
        `Total: ${batch.counts.total}, Pending: ${batch.counts.pending}`);
    } else {
      logTest('batch.status() - with tasks', false, statusResponse.error);
    }

    // Test 5: List tasks in batch
    console.log('\nTest 5: batch.listTasks()');
    const listTasksResponse = await client.batch.listTasks(batchId);

    if (listTasksResponse.success && listTasksResponse.tasks) {
      const isValid = listTasksResponse.tasks.length === 3;
      logTest('batch.listTasks()', isValid, `Found ${listTasksResponse.tasks.length} tasks`);

      if (listTasksResponse.tasks.length > 0) {
        console.log('  Sample task:', {
          task_id: listTasksResponse.tasks[0].task_id,
          status: listTasksResponse.tasks[0].status,
          input: listTasksResponse.tasks[0].input?.substring(0, 50) + '...'
        });
      }
    } else {
      logTest('batch.listTasks()', false, listTasksResponse.error);
    }

    // Test 6: List all batches
    console.log('\nTest 6: batch.list()');
    const listBatchesResponse = await client.batch.list();

    if (listBatchesResponse.success && listBatchesResponse.batches) {
      const ourBatch = listBatchesResponse.batches.find(b => b.batch_id === batchId);
      logTest('batch.list()', ourBatch !== undefined,
        `Found ${listBatchesResponse.batches.length} batches, includes our batch: ${ourBatch !== undefined}`);
    } else {
      logTest('batch.list()', false, listBatchesResponse.error);
    }

    // Test 7: Cancel batch
    console.log('\nTest 7: batch.cancel()');
    const cancelResponse = await client.batch.cancel(batchId);

    if (cancelResponse.success) {
      logTest('batch.cancel()', true, 'Batch cancelled successfully');

      // Verify cancellation
      const verifyResponse = await client.batch.status(batchId);
      if (verifyResponse.success && verifyResponse.batch) {
        const isCancelled = verifyResponse.batch.status === 'cancelled';
        logTest('batch.cancel() - verify', isCancelled,
          `Status after cancel: ${verifyResponse.batch.status}`);
      }
    } else {
      logTest('batch.cancel()', false, cancelResponse.error);
    }

    // Test 8: waitForCompletion (test with already cancelled batch)
    console.log('\nTest 8: batch.waitForCompletion() - cancelled batch');
    try {
      const waitResponse = await client.batch.waitForCompletion(batchId, {
        pollInterval: 2000,
        maxWaitTime: 10000
      });

      if (waitResponse.status === 'cancelled') {
        logTest('batch.waitForCompletion()', true, 'Correctly returned cancelled status');
      } else {
        logTest('batch.waitForCompletion()', false, `Unexpected status: ${waitResponse.status}`);
      }
    } catch (error) {
      logTest('batch.waitForCompletion()', false, error.message);
    }

    // Test 9: Error handling - invalid batch ID
    console.log('\nTest 9: Error handling - invalid batch ID');
    const invalidResponse = await client.batch.status('invalid-batch-id');

    if (!invalidResponse.success && invalidResponse.error) {
      logTest('Error handling - invalid ID', true, 'Correctly returned error');
    } else {
      logTest('Error handling - invalid ID', false, 'Should have returned error');
    }

    // Test 10: Error handling - add tasks without tasks array
    console.log('\nTest 10: Error handling - empty tasks array');
    const emptyTasksResponse = await client.batch.addTasks(batchId, { tasks: [] });

    if (!emptyTasksResponse.success && emptyTasksResponse.error) {
      logTest('Error handling - empty tasks', true, 'Correctly rejected empty tasks array');
    } else {
      logTest('Error handling - empty tasks', false, 'Should have rejected empty tasks');
    }

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    console.error(error.stack);
  }

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${results.passed.length}`);
  console.log(`Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('\nFailed tests:');
    results.failed.forEach(({ name, details }) => {
      console.log(`  - ${name}: ${details}`);
    });
    process.exit(1);
  } else {
    console.log('\n✓ All tests passed!');
    process.exit(0);
  }
}

// Run tests
runTests();
