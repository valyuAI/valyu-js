require('dotenv').config();

const { Valyu } = require('../dist/index.js');

async function testSearch(valyu) {
  console.log("\n=== Testing Search API ===");

  // Test 1: Basic search
  console.log("\nTest 1: Basic search");
  const testQuery = "What is attention mechanism in deep learning?";
  console.log(`Attempting to call valyu.search with query: '${testQuery}'`);

  try {
    const response = await valyu.search(
        testQuery,
        {
          searchType: "all",
          maxNumResults: 10
        }
    );

    console.log("Search response received:", JSON.stringify(response, null, 2));

    if (response && response.success === true && !response.error) {
      console.log("Basic search test PASSED!");
    } else {
      console.error("Basic search test FAILED. Response did not indicate success or contained an error.");
      console.error("Full response:", response);
      return false;
    }
  } catch (error) {
    console.error("Basic search test FAILED due to an exception:", error);
    return false;
  }

  // Test 2: News search mode
  console.log("\nTest 2: News search mode");
  const newsQuery = "latest technology news";

  try {
    const response = await valyu.search(
        newsQuery,
        {
          searchType: "news",
          maxNumResults: 5
        }
    );

    console.log("News search response received");
    console.log(`Success: ${response.success}`);
    console.log(`Number of results: ${response.results.length}`);

    if (response && response.success === true && !response.error) {
      console.log("News search test PASSED!");
    } else {
      console.error("News search test FAILED. Response did not indicate success or contained an error.");
      console.error("Full response:", response);
      return false;
    }
  } catch (error) {
    console.error("News search test FAILED due to an exception:", error);
    return false;
  }

  // Test 3: Fast mode search (relevance_score should be optional)
  console.log("\nTest 3: Fast mode search");
  const fastModeQuery = "quantum computing breakthroughs";

  try {
    const response = await valyu.search(
        fastModeQuery,
        {
          fastMode: true,
          maxNumResults: 5
        }
    );

    console.log("Fast mode search response received");
    console.log(`Success: ${response.success}`);
    console.log(`Number of results: ${response.results.length}`);

    if (response && response.success === true && !response.error) {
      // Verify that results are returned and relevance_score is optional
      if (response.results.length > 0) {
        const firstResult = response.results[0];
        console.log(`First result has title: ${!!firstResult.title}`);
        console.log(`First result has url: ${!!firstResult.url}`);
        console.log(`First result has content: ${!!firstResult.content}`);
        console.log(`First result relevance_score: ${firstResult.relevance_score !== undefined ? firstResult.relevance_score : 'not present (expected in fast mode)'}`);
      }
      console.log("Fast mode search test PASSED!");
    } else {
      console.error("Fast mode search test FAILED. Response did not indicate success or contained an error.");
      console.error("Full response:", response);
      return false;
    }
  } catch (error) {
    console.error("Fast mode search test FAILED due to an exception:", error);
    return false;
  }

  // Test 4: URL only mode search (relevance_score should be optional)
  console.log("\nTest 4: URL only mode search");
  const urlOnlyQuery = "artificial intelligence applications";

  try {
    const response = await valyu.search(
        urlOnlyQuery,
        {
          urlOnly: true,
          maxNumResults: 5
        }
    );

    console.log("URL only mode search response received");
    console.log(`Success: ${response.success}`);
    console.log(`Number of results: ${response.results.length}`);

    if (response && response.success === true && !response.error) {
      // Verify that results are returned and relevance_score is optional
      if (response.results.length > 0) {
        const firstResult = response.results[0];
        console.log(`First result has url: ${!!firstResult.url}`);
        console.log(`First result relevance_score: ${firstResult.relevance_score !== undefined ? firstResult.relevance_score : 'not present (expected in url only mode)'}`);
      }
      console.log("URL only mode search test PASSED!");
    } else {
      console.error("URL only mode search test FAILED. Response did not indicate success or contained an error.");
      console.error("Full response:", response);
      return false;
    }
  } catch (error) {
    console.error("URL only mode search test FAILED due to an exception:", error);
    return false;
  }

  console.log("\nSearch API tests completed!");
  return true;
}

async function testContents(valyu) {
  console.log("\n=== Testing Contents API ===");
  
  // Test 1: Basic content extraction
  console.log("\nTest 1: Basic content extraction");
  const testUrls1 = ["https://www.example.com"];
  
  try {
    const response1 = await valyu.contents(testUrls1);
    console.log("Basic extraction response:", JSON.stringify(response1, null, 2));
    
    if (!response1.success) {
      console.log("Basic extraction test completed (may fail on example.com)");
    } else {
      console.log("Basic extraction test PASSED!");
    }
  } catch (error) {
    console.error("Basic extraction test FAILED:", error);
    return false;
  }

  // Test 2: Content with AI summary
  console.log("\nTest 2: Content with AI summary");
  const testUrls2 = ["https://en.wikipedia.org/wiki/Artificial_intelligence"];
  
  try {
    const response2 = await valyu.contents(testUrls2, {
      summary: true,
      responseLength: "short",
      extractEffort: "normal"
    });
    console.log("AI summary response received");
    console.log(`Success: ${response2.success}`);
    console.log(`URLs processed: ${response2.urls_processed}/${response2.urls_requested}`);
    
    if (response2.results && response2.results.length > 0) {
      console.log(`First result title: ${response2.results[0].title}`);
      console.log(`Content length: ${response2.results[0].length} characters`);
      console.log(`Has summary: ${response2.results[0].summary ? 'Yes' : 'No'}`);
    }
    
    console.log("AI summary test completed!");
  } catch (error) {
    console.error("AI summary test FAILED:", error);
    return false;
  }

  // Test 3: Multiple URLs
  console.log("\nTest 3: Multiple URLs processing");
  const testUrls3 = [
    "https://www.wikipedia.org",
    "https://www.github.com"
  ];
  
  try {
    const response3 = await valyu.contents(testUrls3, {
      responseLength: "short"
    });
    console.log("Multiple URLs response received");
    console.log(`Success: ${response3.success}`);
    console.log(`URLs processed: ${response3.urls_processed}/${response3.urls_requested}`);
    console.log(`Total cost: $${response3.total_cost_dollars || 0}`);
    
    console.log("Multiple URLs test completed!");
  } catch (error) {
    console.error("Multiple URLs test FAILED:", error);
    return false;
  }

  // Test 4: Custom instructions
  console.log("\nTest 4: Custom summary instructions");
  const testUrls4 = ["https://en.wikipedia.org/wiki/Machine_learning"];
  
  try {
    const response4 = await valyu.contents(testUrls4, {
      summary: "Summarize in 3 bullet points",
      responseLength: "medium"
    });
    console.log("Custom instructions response received");
    console.log(`Success: ${response4.success}`);
    
    if (response4.results && response4.results.length > 0) {
      console.log(`Summary type: ${typeof response4.results[0].summary}`);
    }
    
    console.log("Custom instructions test completed!");
  } catch (error) {
    console.error("Custom instructions test FAILED:", error);
    return false;
  }

  // Test 5: Structured extraction with JSON schema
  console.log("\nTest 5: Structured extraction with JSON schema");
  const testUrls5 = ["https://www.anthropic.com"];
  
  try {
    const response5 = await valyu.contents(testUrls5, {
      summary: {
        type: "object",
        properties: {
          company_name: { type: "string" },
          industry: { 
            type: "string",
            enum: ["tech", "finance", "healthcare", "retail", "other"]
          },
          key_products: {
            type: "array",
            items: { type: "string" },
            maxItems: 3
          }
        },
        required: ["company_name"]
      },
      extractEffort: "high"
    });
    console.log("Structured extraction response received");
    console.log(`Success: ${response5.success}`);
    
    if (response5.results && response5.results.length > 0 && response5.results[0].summary) {
      console.log("Extracted structured data:", JSON.stringify(response5.results[0].summary, null, 2));
    }
    
    console.log("Structured extraction test completed!");
  } catch (error) {
    console.error("Structured extraction test FAILED:", error);
    return false;
  }

  // Test 6: Error handling - too many URLs
  console.log("\nTest 6: Error handling - too many URLs");
  const tooManyUrls = Array(11).fill("https://example.com");
  
  try {
    const response6 = await valyu.contents(tooManyUrls);
    
    if (!response6.success && response6.error && response6.error.includes("Maximum 10 URLs")) {
      console.log("Error handling test PASSED - correctly rejected >10 URLs");
    } else {
      console.error("Error handling test FAILED - should reject >10 URLs");
      return false;
    }
  } catch (error) {
    console.error("Error handling test FAILED:", error);
    return false;
  }

  // Test 7: Error handling - empty array
  console.log("\nTest 7: Error handling - empty array");
  
  try {
    const response7 = await valyu.contents([]);
    
    if (!response7.success && response7.error && response7.error.includes("empty")) {
      console.log("Error handling test PASSED - correctly rejected empty array");
    } else {
      console.error("Error handling test FAILED - should reject empty array");
      return false;
    }
  } catch (error) {
    console.error("Error handling test FAILED:", error);
    return false;
  }

  console.log("\nContents API tests completed!");
  return true;
}

async function testAnswer(valyu) {
  console.log("\n=== Testing Answer API ===");

  // Test 1: Basic answer request
  console.log("\nTest 1: Basic answer request");
  const basicQuery = "What is machine learning?";

  try {
    const response1 = await valyu.answer(basicQuery);
    console.log("Basic answer response received");
    console.log(`Success: ${response1.success}`);

    if (response1.success) {
      console.log(`AI transaction ID: ${response1.ai_tx_id}`);
      console.log(`Original query: ${response1.original_query}`);
      console.log(`Data type: ${response1.data_type}`);
      console.log(`Content length: ${response1.contents.length} characters`);
      console.log(`Number of search results: ${response1.search_results.length}`);
      console.log(`Total cost: $${response1.cost.total_deduction_dollars}`);
      console.log("Basic answer test PASSED!");
    } else {
      console.error("Basic answer test FAILED:", response1.error);
      return false;
    }
  } catch (error) {
    console.error("Basic answer test FAILED:", error);
    return false;
  }

  // Test 2: Answer with system instructions
  console.log("\nTest 2: Answer with system instructions");
  const systemInstructionsQuery = "Explain quantum computing";

  try {
    const response2 = await valyu.answer(systemInstructionsQuery, {
      systemInstructions: "You are a computer science professor. Explain concepts clearly with examples.",
      searchType: "all"
    });
    console.log("System instructions answer response received");
    console.log(`Success: ${response2.success}`);

    if (response2.success) {
      console.log(`Content includes instructions-style response: ${response2.contents.includes('example') || response2.contents.includes('Example')}`);
      console.log("System instructions test PASSED!");
    } else {
      console.error("System instructions test FAILED:", response2.error);
      return false;
    }
  } catch (error) {
    console.error("System instructions test FAILED:", error);
    return false;
  }

  // Test 3: Structured output answer
  console.log("\nTest 3: Structured output answer");
  const structuredQuery = "What are the benefits of renewable energy?";
  const schema = {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "Brief summary of renewable energy benefits"
      },
      key_benefits: {
        type: "array",
        items: {
          type: "string"
        },
        description: "List of key benefits",
        maxItems: 5
      },
      challenges: {
        type: "string",
        description: "Main challenges or limitations"
      }
    },
    required: ["summary", "key_benefits"]
  };

  try {
    const response3 = await valyu.answer(structuredQuery, {
      structuredOutput: schema,
      searchType: "web"
    });
    console.log("Structured output answer response received");
    console.log(`Success: ${response3.success}`);

    if (response3.success) {
      console.log(`Data type: ${response3.data_type}`);
      if (response3.data_type === "structured" && typeof response3.contents === "object") {
        console.log("Structured data received:", JSON.stringify(response3.contents, null, 2));
        console.log("Structured output test PASSED!");
      } else {
        console.log("Warning: Expected structured data but received unstructured");
        console.log("Structured output test PASSED (with warning)!");
      }
    } else {
      console.error("Structured output test FAILED:", response3.error);
      return false;
    }
  } catch (error) {
    console.error("Structured output test FAILED:", error);
    return false;
  }

  // Test 4: Answer with source filtering
  console.log("\nTest 4: Answer with source filtering");
  const filteringQuery = "What is neural networks?";

  try {
    const response4 = await valyu.answer(filteringQuery, {
      searchType: "web",
      includedSources: ["towardsdatascience.com"],
      startDate: "2024-01-01"
    });
    console.log("Source filtering answer response received");
    console.log(`Success: ${response4.success}`);

    if (response4.success) {
      console.log(`Number of search results: ${response4.search_results.length}`);
      console.log("Source filtering test PASSED!");
    } else {
      console.error("Source filtering test FAILED:", response4.error);
      return false;
    }
  } catch (error) {
    console.error("Source filtering test FAILED:", error);
    return false;
  }

  // Test 5: Fast mode answer
  console.log("\nTest 5: Fast mode answer");
  const fastModeQuery = "What is artificial intelligence?";

  try {
    const response5 = await valyu.answer(fastModeQuery, {
      fastMode: true,
      systemInstructions: "Provide a concise explanation."
    });
    console.log("Fast mode answer response received");
    console.log(`Success: ${response5.success}`);

    if (response5.success) {
      console.log(`Content length: ${response5.contents.length} characters`);
      console.log(`Total cost: $${response5.cost.total_deduction_dollars}`);
      console.log("Fast mode test PASSED!");
    } else {
      console.error("Fast mode test FAILED:", response5.error);
      return false;
    }
  } catch (error) {
    console.error("Fast mode test FAILED:", error);
    return false;
  }

  // Test 6: Error handling - empty query
  console.log("\nTest 6: Error handling - empty query");

  try {
    const response6 = await valyu.answer("");

    if (!response6.success && response6.error && response6.error.includes("required")) {
      console.log("Error handling test PASSED - correctly rejected empty query");
    } else {
      console.error("Error handling test FAILED - should reject empty query");
      return false;
    }
  } catch (error) {
    console.error("Error handling test FAILED:", error);
    return false;
  }

  // Test 7: Error handling - invalid search type
  console.log("\nTest 7: Error handling - invalid search type");

  try {
    const response7 = await valyu.answer("test query", {
      searchType: "invalid_type"
    });

    if (!response7.success && response7.error && response7.error.includes("Invalid searchType")) {
      console.log("Error handling test PASSED - correctly rejected invalid search type");
    } else {
      console.error("Error handling test FAILED - should reject invalid search type");
      return false;
    }
  } catch (error) {
    console.error("Error handling test FAILED:", error);
    return false;
  }

  console.log("\nAnswer API tests completed!");
  return true;
}

async function runTest() {
  console.log("Starting integration tests...");

  const apiKey = process.env.VALYU_API_KEY;
  if (!apiKey) {
    console.error("VALYU_API_KEY environment variable is not set.");
    process.exit(1);
  }

  const valyu = new Valyu(apiKey);

  let allTestsPassed = true;

  // Run Search API tests
  const searchPassed = await testSearch(valyu);
  allTestsPassed = allTestsPassed && searchPassed;

  // Run Contents API tests
  const contentsPassed = await testContents(valyu);
  allTestsPassed = allTestsPassed && contentsPassed;

  // Run Answer API tests
  const answerPassed = await testAnswer(valyu);
  allTestsPassed = allTestsPassed && answerPassed;

  if (allTestsPassed) {
    console.log("\n=== All integration tests PASSED! ===");
    process.exit(0);
  } else {
    console.error("\n=== Some integration tests FAILED ===");
    process.exit(1);
  }
}

runTest(); 