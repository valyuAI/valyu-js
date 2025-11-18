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

  // Search for AI
  console.log("🔍 AI Search:");
  try {
    const response = await valyu.search("what is trans-applifying mRNA");
    console.log(response);
  } catch (error) {
    console.error("AI search failed:", error.message);
  }

  // Deep search over academic papers
  console.log("🔬 Paper Search:");
  try {
    const response = await valyu.search(
      "implementation details of agentic search-enhanced large reasoning models",
      {
        searchType: "proprietary",
        maxNumResults: 10,
        relevanceThreshold: 0.6,
        includedSources: ["valyu/valyu-arxiv"],
        category: "agentic RAG",
        startDate: "2024-12-01",
      }
    );
    console.log(response);
  } catch (error) {
    console.error("Paper search failed:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  console.log("🌐 Web Search:");
  try {
    const response = await valyu.search(
      "what are the grok 4 benchmark results",
      {
        searchType: "web",
        maxNumResults: 7,
        relevanceThreshold: 0.5,
        startDate: "2025-06-01",
        endDate: "2025-07-25",
      }
    );
    console.log(response);
  } catch (error) {
    console.error("Web search failed:", error.message);
  }

  // Web search with country filtering
  console.log("🌐 Web Search with Country Filter:");
  try {
    const response = await valyu.search(
      "what is the weather where i am?",
      {
        searchType: "web",
        maxNumResults: 2,
        countryCode: "UK",
        responseLength: "short",
      }
    );
    console.log(response);
  } catch (error) {
    console.error("Web search with country filter failed:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // News search
  console.log("📰 News Search:");
  try {
    const response = await valyu.search(
      "latest AI developments",
      {
        searchType: "news",
        maxNumResults: 10,
        relevanceThreshold: 0.5,
        startDate: "2025-01-01",
      }
    );
    console.log(response);
  } catch (error) {
    console.error("News search failed:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Hybrid search with exclude sources
  console.log("🔄 Hybrid Search with Source Exclusion:");
  try {
    const response = await valyu.search(
      "quantum computing applications in cryptography",
      {
        searchType: "all",
        maxNumResults: 8,
        relevanceThreshold: 0.5,
        maxPrice: 40,
        excludeSources: ["paperswithcode.com", "wikipedia.org"],
        responseLength: "large",
        isToolCall: true,
      }
    );
    console.log(response);
  } catch (error) {
    console.error("Hybrid search with source exclusion failed:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Search with custom response length (character count)
  console.log("📏 Custom Response Length Search:");
  try {
    const response = await valyu.search(
      "State of video generation AI models",
      {
        maxNumResults: 10,
        category: "vLLMs",
        responseLength: 1000,  // Limit to 1000 characters per result
      }
    );
    console.log(response);
  } catch (error) {
    console.error("Custom response length search failed:", error.message);
  }
}

runExamples().catch(console.error); 