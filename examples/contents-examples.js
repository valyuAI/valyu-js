require('dotenv').config();

const { Valyu } = require('../dist/index.js');

async function runContentsExamples() {
  console.log("=== Valyu Contents API Examples ===\n");

  const apiKey = process.env.VALYU_API_KEY;
  if (!apiKey) {
    console.error("Please set VALYU_API_KEY environment variable");
    process.exit(1);
  }

  const valyu = new Valyu(apiKey);

  // Example 1: Basic content extraction
  console.log("Example 1: Basic Content Extraction");
  console.log("====================================");
  try {
    const response = await valyu.contents(
      ["https://en.wikipedia.org/wiki/JavaScript"]
    );
    
    console.log(`Success: ${response.success}`);
    console.log(`URLs processed: ${response.urls_processed}/${response.urls_requested}`);
    const r0 = response.results?.[0];
    if (r0) {
      if (r0.status === "success") {
        console.log(`Title: ${r0.title}`);
        console.log(`Content length: ${r0.length} characters`);
        console.log(`First 200 chars: ${String(r0.content).substring(0, 200)}...`);
      } else {
        console.log(`Failed: ${r0.url} - ${r0.error}`);
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }

  console.log("\n---\n");

  // Example 2: Content with AI summary
  console.log("Example 2: Content with AI Summary");
  console.log("===================================");
  try {
    const response = await valyu.contents(
      ["https://en.wikipedia.org/wiki/Artificial_intelligence"],
      {
        summary: true,
        responseLength: "short"
      }
    );
    
    console.log(`Success: ${response.success}`);
    const r0 = response.results?.[0];
    if (r0?.status === "success") {
      console.log(`Title: ${r0.title}`);
      console.log(`Has summary: ${r0.summary ? "Yes" : "No"}`);
      if (r0.summary) console.log(`Summary: ${r0.summary}`);
    } else if (r0) {
      console.log(`Failed: ${r0.url} - ${r0.error}`);
    }
  } catch (error) {
    console.error("Error:", error.message);
  }

  console.log("\n---\n");

  // Example 3: Custom summary instructions
  console.log("Example 3: Custom Summary Instructions");
  console.log("======================================");
  try {
    const response = await valyu.contents(
      ["https://en.wikipedia.org/wiki/Machine_learning"],
      {
        summary: "Summarize this article in exactly 3 bullet points focusing on key concepts",
        responseLength: "medium",
        extractEffort: "high"
      }
    );
    
    console.log(`Success: ${response.success}`);
    if (response.results && response.results[0]) {
      console.log(`Title: ${response.results[0].title}`);
      if (response.results[0].summary) {
        console.log("Custom Summary:");
        console.log(response.results[0].summary);
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }

  console.log("\n---\n");

  // Example 4: Multiple URLs processing
  console.log("Example 4: Processing Multiple URLs");
  console.log("====================================");
  try {
    const response = await valyu.contents(
      [
        "https://www.python.org",
        "https://nodejs.org",
        "https://www.rust-lang.org"
      ],
      {
        responseLength: "short"
      }
    );
    
    console.log(`Success: ${response.success}`);
    console.log(`URLs processed: ${response.urls_processed}/${response.urls_requested}`);
    console.log(`Total cost: $${response.total_cost_dollars || 0}`);
    console.log(`Total characters: ${response.total_characters}`);
    
    if (response.results) {
      response.results.forEach((result, index) => {
        if (result.status === 'success') {
          console.log(`\n${index + 1}. ${result.title}`);
          console.log(`   URL: ${result.url}`);
          console.log(`   Length: ${result.length} characters`);
        } else {
          console.log(`\n${index + 1}. Failed: ${result.url} - ${result.error}`);
        }
      });
    }
  } catch (error) {
    console.error("Error:", error.message);
  }

  console.log("\n---\n");

  // Example 5: Async mode with waitForJob (11+ URLs)
  console.log("Example 5: Async Mode with waitForJob");
  console.log("=====================================");
  try {
    // Use async for >10 URLs - simulate with 12 URLs
    const manyUrls = [
      "https://www.python.org",
      "https://nodejs.org",
      "https://www.rust-lang.org",
      "https://go.dev",
      "https://www.ruby-lang.org",
      "https://www.php.net",
      "https://kotlinlang.org",
      "https://www.typescriptlang.org",
      "https://swift.org",
      "https://dart.dev",
      "https://elixir-lang.org",
      "https://www.scala-lang.org",
    ];
    const job = await valyu.contents(manyUrls, {
      async: true,
      responseLength: "short",
    });

    // Check if async job (has jobId)
    if (job.jobId) {
      console.log(`Job created: ${job.jobId}`);
      const final = await valyu.waitForJob(job.jobId, {
        pollInterval: 5000,
        onProgress: (s) =>
          console.log(`  Progress: ${s.urlsProcessed}/${s.urlsTotal} (${s.status})`),
      });
      console.log(`Completed: ${final.status}`);
      console.log(`Processed: ${final.urlsProcessed}, Failed: ${final.urlsFailed}`);
      if (final.results) {
        final.results.slice(0, 3).forEach((r, i) => {
          if (r.status === "success") {
            console.log(`  ${i + 1}. ${r.title}`);
          } else {
            console.log(`  ${i + 1}. Failed: ${r.url}`);
          }
        });
      }
    } else {
      console.log("Sync response received");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }

  console.log("\n---\n");

  // Example 6: Structured data extraction with JSON schema
  console.log("Example 6: Structured Data Extraction");
  console.log("======================================");
  try {
    const response = await valyu.contents(
      ["https://www.openai.com"],
      {
        summary: {
          type: "object",
          properties: {
            company_name: { 
              type: "string",
              description: "The name of the company"
            },
            industry: { 
              type: "string",
              enum: ["tech", "finance", "healthcare", "retail", "other"],
              description: "Primary industry sector"
            },
            key_products: {
              type: "array",
              items: { type: "string" },
              maxItems: 3,
              description: "Main products or services"
            },
            founded_year: {
              type: "number",
              description: "Year the company was founded"
            }
          },
          required: ["company_name", "industry"]
        },
        extractEffort: "high"
      }
    );
    
    console.log(`Success: ${response.success}`);
    if (response.results && response.results[0]) {
      console.log(`URL: ${response.results[0].url}`);
      if (response.results[0].summary) {
        console.log("Extracted structured data:");
        console.log(JSON.stringify(response.results[0].summary, null, 2));
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }

  console.log("\n---\n");

  // Example 7: Different response lengths
  console.log("Example 7: Response Length Control");
  console.log("===================================");
  const testUrl = ["https://en.wikipedia.org/wiki/Quantum_computing"];
  
  const lengths = ["short", "medium", 500]; // short, medium, and custom character count
  
  for (const length of lengths) {
    try {
      console.log(`\nTesting with responseLength: ${length}`);
      const response = await valyu.contents(testUrl, {
        responseLength: length
      });
      
      if (response.results && response.results[0]) {
        console.log(`  Content length: ${response.results[0].length} characters`);
      }
    } catch (error) {
      console.error(`  Error: ${error.message}`);
    }
  }

  console.log("\n---\n");

  // Example 8: High extraction effort for complex pages
  console.log("Example 8: High Extraction Effort");
  console.log("==================================");
  try {
    const response = await valyu.contents(
      ["https://arxiv.org"],
      {
        extractEffort: "high",
        responseLength: "large",
        summary: "List the main research categories available on this site"
      }
    );
    
    console.log(`Success: ${response.success}`);
    if (response.results && response.results[0]) {
      console.log(`Title: ${response.results[0].title}`);
      console.log(`Content extracted: ${response.results[0].length} characters`);
      if (response.results[0].summary) {
        console.log("Summary of research categories:");
        console.log(response.results[0].summary);
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }

  console.log("\n---\n");

  // Example 9: Cost control with max price
  console.log("Example 9: Cost Control");
  console.log("========================");
  try {
    const response = await valyu.contents(
      [
        "https://www.nature.com",
        "https://www.science.org",
        "https://www.cell.com"
      ],
      {
        summary: true,
        responseLength: "medium",
        maxPriceDollars: 0.01 // Limit to 1 cent
      }
    );
    
    console.log(`Success: ${response.success}`);
    console.log(`URLs processed: ${response.urls_processed}/${response.urls_requested}`);
    console.log(`Total cost: $${response.total_cost_dollars || 0}`);
    
    if (response.error) {
      console.log(`Note: ${response.error}`);
    }
  } catch (error) {
    console.error("Error:", error.message);
  }

  console.log("\n=== Examples Complete ===");
}

// Run the examples
runContentsExamples().catch(console.error);