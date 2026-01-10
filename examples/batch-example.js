/**
 * Batch API Example
 *
 * Demonstrates how to use the Valyu Batch API to process
 * multiple DeepResearch tasks efficiently.
 */

const { Valyu } = require('../dist/index.js');

const client = new Valyu(process.env.VALYU_API_KEY);

async function batchExample() {
  try {
    console.log('=== Batch API Example ===\n');

    // 1. Create a new batch
    console.log('Step 1: Creating batch...');
    const batch = await client.batch.create({
      name: 'Research Questions Batch',
      model: 'fast', // or 'standard', 'heavy'
      outputFormats: ['markdown'],
      metadata: {
        project: 'Q4-Research',
        user: 'analyst-1'
      }
    });

    if (!batch.success) {
      throw new Error(`Failed to create batch: ${batch.error}`);
    }

    console.log(`✓ Created batch: ${batch.batch_id}\n`);
    const batchId = batch.batch_id;

    // 2. Add tasks to the batch
    console.log('Step 2: Adding tasks to batch...');
    const addResult = await client.batch.addTasks(batchId, {
      tasks: [
        {
          query: 'What are the latest developments in quantum computing?',
          metadata: { priority: 'high' }
        },
        {
          query: 'Analyze the impact of AI on healthcare in 2024',
          metadata: { priority: 'medium' }
        },
        {
          query: 'Compare renewable energy trends across Europe',
          metadata: { priority: 'low' }
        }
      ]
    });

    if (!addResult.success) {
      console.log(`⚠ Warning: ${addResult.error}`);
      console.log('Note: Tasks may still be added despite error (backend issue)\n');
    } else {
      console.log(`✓ Added ${addResult.added} tasks\n`);
    }

    // 3. Check batch status
    console.log('Step 3: Checking batch status...');
    const status = await client.batch.status(batchId);

    if (status.success && status.batch) {
      console.log('Batch Status:', {
        status: status.batch.status,
        total: status.batch.counts.total,
        completed: status.batch.counts.completed,
        running: status.batch.counts.running,
        queued: status.batch.counts.queued
      });
      console.log();
    }

    // 4. List tasks in the batch
    console.log('Step 4: Listing tasks...');
    const tasksList = await client.batch.listTasks(batchId);

    if (tasksList.success && tasksList.tasks) {
      console.log(`Found ${tasksList.tasks.length} tasks:`);
      tasksList.tasks.forEach((task, i) => {
        if (task.query) {
          console.log(`  ${i + 1}. ${task.status}: ${task.query.substring(0, 50)}...`);
        }
      });
      console.log();
    }

    // 5. Wait for completion (with progress callback)
    console.log('Step 5: Waiting for completion...');
    try {
      const finalBatch = await client.batch.waitForCompletion(batchId, {
        pollInterval: 10000, // Poll every 10 seconds
        maxWaitTime: 600000, // Wait up to 10 minutes
        onProgress: (batch) => {
          console.log(`  Progress: ${batch.counts.completed}/${batch.counts.total} completed`);
        }
      });

      console.log('✓ Batch completed!');
      console.log('Final counts:', finalBatch.counts);
      console.log('Total cost: $' + finalBatch.usage.total_cost.toFixed(4));
    } catch (error) {
      console.log(`⚠ Wait interrupted: ${error.message}`);
    }

    // 6. Get final results
    const finalStatus = await client.batch.status(batchId);
    if (finalStatus.success && finalStatus.batch) {
      console.log('\nFinal Results:', {
        status: finalStatus.batch.status,
        completed: finalStatus.batch.counts.completed,
        failed: finalStatus.batch.counts.failed,
        total_cost: `$${finalStatus.batch.usage.total_cost.toFixed(4)}`
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// List all batches example
async function listAllBatches() {
  console.log('\n=== List All Batches ===\n');

  const result = await client.batch.list();

  if (result.success && result.batches) {
    console.log(`Found ${result.batches.length} batches:\n`);

    result.batches.slice(0, 5).forEach((batch, i) => {
      console.log(`${i + 1}. ${batch.batch_id}`);
      console.log(`   Name: ${batch.name || 'Unnamed'}`);
      console.log(`   Status: ${batch.status}`);
      console.log(`   Tasks: ${batch.counts.total}`);
      console.log();
    });
  }
}

// Cancel batch example
async function cancelBatchExample(batchId) {
  console.log('\n=== Cancel Batch ===\n');

  const result = await client.batch.cancel(batchId);

  if (result.success) {
    console.log(`✓ Batch ${batchId} cancelled successfully`);
  } else {
    console.log(`✗ Failed to cancel: ${result.error}`);
  }
}

// Run the examples
if (require.main === module) {
  batchExample()
    .then(() => listAllBatches())
    .catch(console.error);
}

module.exports = {
  batchExample,
  listAllBatches,
  cancelBatchExample
};
