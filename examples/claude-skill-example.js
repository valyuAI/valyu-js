/**
 * Example usage of the Valyy Claude Skill
 * 
 * This demonstrates how the skill handler processes tool calls
 */

require('dotenv').config();
const { handler } = require('../dist/skill.js');

async function runExamples() {
  console.log("Valyy Claude Skill Examples");
  console.log("============================\n");

  // Example 1: Search
  console.log("1. Search Example:");
  try {
    const searchResult = await handler("search", {
      query: "what is machine learning",
      searchType: "all",
      maxNumResults: 5,
    });
    console.log("Success:", searchResult.success);
    if (searchResult.success) {
      console.log(`Found ${searchResult.results?.length || 0} results`);
      console.log(`Cost: $${searchResult.total_deduction_dollars?.toFixed(4) || 0}`);
    } else {
      console.log("Error:", searchResult.error);
    }
  } catch (error) {
    console.error("Search failed:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 2: Contents
  console.log("2. Contents Example:");
  try {
    const contentsResult = await handler("contents", {
      urls: ["https://www.valyu.ai/"],
      summary: true,
      responseLength: "short",
    });
    console.log("Success:", contentsResult.success);
    if (contentsResult.success) {
      console.log(`Processed ${contentsResult.urls_processed}/${contentsResult.urls_requested} URLs`);
      if (contentsResult.results && contentsResult.results.length > 0) {
        console.log(`Title: ${contentsResult.results[0].title}`);
        if (contentsResult.results[0].summary) {
          console.log(`Summary: ${typeof contentsResult.results[0].summary === 'string' 
            ? contentsResult.results[0].summary.substring(0, 200) + '...'
            : JSON.stringify(contentsResult.results[0].summary)}`);
        }
      }
    } else {
      console.log("Error:", contentsResult.error);
    }
  } catch (error) {
    console.error("Contents failed:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 3: Answer
  console.log("3. Answer Example:");
  try {
    const answerResult = await handler("answer", {
      query: "What is Valyu?",
      searchType: "web",
      fastMode: true,
    });
    console.log("Success:", answerResult.success);
    if (answerResult.success) {
      console.log(`Answer: ${typeof answerResult.contents === 'string' 
        ? answerResult.contents.substring(0, 300) + '...'
        : JSON.stringify(answerResult.contents)}`);
      console.log(`Search results used: ${answerResult.search_results?.length || 0}`);
    } else {
      console.log("Error:", answerResult.error);
    }
  } catch (error) {
    console.error("Answer failed:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 4: DeepResearch Create
  console.log("4. DeepResearch Create Example:");
  try {
    const deepResearchResult = await handler("deepresearch_create", {
      input: "What are the latest developments in AI?",
      model: "lite",
      outputFormats: ["markdown"],
    });
    console.log("Success:", deepResearchResult.success);
    if (deepResearchResult.success) {
      console.log(`Task ID: ${deepResearchResult.deepresearch_id}`);
      console.log(`Status: ${deepResearchResult.status}`);
    } else {
      console.log("Error:", deepResearchResult.error);
    }
  } catch (error) {
    console.error("DeepResearch create failed:", error.message);
  }
}

// Run examples if VALYU_API_KEY is set
if (process.env.VALYU_API_KEY) {
  runExamples().catch(console.error);
} else {
  console.error("VALYU_API_KEY environment variable is not set.");
  console.log("Set it to run the examples:");
  console.log("export VALYU_API_KEY='your-api-key-here'");
  console.log("node examples/claude-skill-example.js");
}
