const { Valyu } = require('../dist/index.js');
require('dotenv').config();

async function main() {
    console.log('=== Valyu DeepResearch SDK Example ===\n');

    // Initialize Valyu client
    const valyu = new Valyu(process.env.VALYU_API_KEY);

    try {
        // Example 1: Basic research task
        console.log('1. Creating a basic research task...');
        const task = await valyu.deepresearch.create({
            input: "What are the key differences between RAG and fine-tuning for LLMs?",
            model: "lite",
            outputFormats: ["markdown"]
        });

        if (!task.success) {
            console.error('Failed to create task:', task.error);
            return;
        }

        console.log(`✓ Task created: ${task.deepresearch_id}`);
        console.log(`  Status: ${task.status}`);
        console.log(`  Model: ${task.model}\n`);

        // Example 2: Wait for completion with progress updates
        console.log('2. Waiting for task completion...');
        const result = await valyu.deepresearch.wait(task.deepresearch_id, {
            pollInterval: 5000,
            maxWaitTime: 600000, // 10 minutes
            onProgress: (status) => {
                if (status.progress) {
                    console.log(`   Progress: Step ${status.progress.current_step}/${status.progress.total_steps}`);
                }
                console.log(`   Status: ${status.status}`);
            }
        });

        if (!result.success) {
            console.error('Task failed:', result.error);
            return;
        }

        console.log('\n✓ Research completed!');
        console.log(`  Status: ${result.status}`);
        console.log(`  Completed at: ${new Date(result.completed_at * 1000).toLocaleString()}`);

        // Display output
        if (result.output) {
            console.log('\n=== Research Output ===');
            console.log(result.output.substring(0, 500) + '...\n');
        }

        // Display sources
        if (result.sources && result.sources.length > 0) {
            console.log(`\n=== Sources (${result.sources.length}) ===`);
            result.sources.slice(0, 5).forEach((source, i) => {
                console.log(`${i + 1}. ${source.title}`);
                console.log(`   URL: ${source.url}`);
            });
            if (result.sources.length > 5) {
                console.log(`   ... and ${result.sources.length - 5} more sources`);
            }
        }

        // Display usage and cost
        if (result.usage) {
            console.log('\n=== Cost Breakdown ===');
            console.log(`  Search cost: $${result.usage.search_cost.toFixed(4)}`);
            console.log(`  Contents cost: $${result.usage.contents_cost.toFixed(4)}`);
            console.log(`  AI cost: $${result.usage.ai_cost.toFixed(4)}`);
            console.log(`  Compute cost: $${result.usage.compute_cost.toFixed(4)}`);
            console.log(`  Total cost: $${result.usage.total_cost.toFixed(4)}`);
        }

        // Display images if any
        if (result.images && result.images.length > 0) {
            console.log(`\n=== Generated Images (${result.images.length}) ===`);
            result.images.forEach((img, i) => {
                console.log(`${i + 1}. ${img.title} (${img.image_type})`);
                console.log(`   URL: ${img.image_url}`);
            });
        }

        // PDF URL if available
        if (result.pdf_url) {
            console.log(`\n=== PDF Report ===`);
            console.log(`  Download: ${result.pdf_url}`);
        }

        console.log('\n=== Example completed successfully! ===');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run the example
main().catch(console.error);
