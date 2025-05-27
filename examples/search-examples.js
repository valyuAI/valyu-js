require('dotenv').config();
const { Valyu } = require('../dist/index.js');

async function runExamples() {
  console.log("Valyu JavaScript SDK Examples");
  console.log("=====================================\n");

  const apiKey = process.env.VALYU_API_KEY;
  if (!apiKey) {
    console.error("VALYU_API_KEY environment variable is not set.");
    process.exit(1);
  }

  const valyu = new Valyu(apiKey);

  // Example 1: Basic Search
  console.log("1. Basic Search");
  console.log("---------------");
  try {
    const response = await valyu.search("What is machine learning?");
    console.log(`Query: "What is machine learning?"`);
    console.log(`Results: ${response.results.length}`);
    console.log(`Success: ${response.success}\n`);
  } catch (error) {
    console.error("Basic search failed:", error.message);
  }

  // Example 2: Advanced Search with v2 Parameters
  console.log("2. Advanced Search with v2 Parameters");
  console.log("--------------------------------------");
  try {
    const response = await valyu.search(
      "agentic search-enhanced large reasoning models",
      {
        searchType: "proprietary",
        maxNumResults: 10,
        relevanceThreshold: 0.6,
        includedSources: ["valyu/valyu-arxiv"],
        startDate: "2024-05-01"
      }
    );
    console.log(`Query: "agentic search-enhanced large reasoning models"`);
    console.log(`Search Type: proprietary`);
    console.log(`Max Results: 10`);
    console.log(`Relevance Threshold: 0.6`);
    console.log(`Included Sources: ["valyu/valyu-arxiv"]`);
    console.log(`Start Date: 2024-05-01`);
    console.log(`Results: ${response.results.length}`);
    console.log(`Success: ${response.success}\n`);
  } catch (error) {
    console.error("Advanced search failed:", error.message);
  }

  // Example 3: Web Search with Date Filtering
  console.log("3. Web Search with Date Filtering");
  console.log("----------------------------------");
  try {
    const response = await valyu.search(
      "what is claude 4 opus model",
      {
        searchType: "web",
        maxNumResults: 7,
        relevanceThreshold: 0.5,
        startDate: "2024-01-01",
        endDate: "2024-12-31"
      }
    );
    console.log(`Query: "what is claude 4 opus model"`);
    console.log(`Search Type: web`);
    console.log(`Date Range: 2024-01-01 to 2024-12-31`);
    console.log(`Results: ${response.results.length}`);
    console.log(`Success: ${response.success}\n`);
  } catch (error) {
    console.error("Web search with date filtering failed:", error.message);
  }

  // Example 4: Search with Category Filter
  console.log("4. Search with Category Filter");
  console.log("-------------------------------");
  try {
    const response = await valyu.search(
      "climate change solutions",
      {
        searchType: "web",
        maxNumResults: 3,
        startDate: "2023-01-01",
        category: "environment",
        relevanceThreshold: 0.7
      }
    );
    console.log(`Query: "climate change solutions"`);
    console.log(`Category: environment`);
    console.log(`Relevance Threshold: 0.7`);
    console.log(`Results: ${response.results.length}`);
    console.log(`Success: ${response.success}\n`);
  } catch (error) {
    console.error("Category search failed:", error.message);
  }

  // Example 5: Tool Call Mode
  console.log("5. Tool Call Mode");
  console.log("-------------------");
  try {
    const response = await valyu.search(
      "latest developments in quantum computing",
      {
        searchType: "all",
        maxNumResults: 5,
        isToolCall: true,
        relevanceThreshold: 0.6,
        maxPrice: 50
      }
    );
    console.log(`Query: "latest developments in quantum computing"`);
    console.log(`Is Tool Call: true`);
    console.log(`Max Price: $50 CPM`);
    console.log(`Results: ${response.results.length}`);
    console.log(`Success: ${response.success}\n`);
  } catch (error) {
    console.error("Tool call search failed:", error.message);
  }

  console.log("All examples completed!");
}

runExamples().catch(console.error); 