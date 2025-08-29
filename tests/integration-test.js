require('dotenv').config();

const { Valyu } = require('../dist/index.js');

async function testSearch(valyu) {
  console.log("\n=== Testing Search API ===");
  const testQuery = "What is attention mechanism in deep learning?";
  console.log(`Attempting to call valyu.search with query: '${testQuery}'`);

  try {
    const response = await valyu.search(
        testQuery,
        {
          searchType: "all",
          maxNumResults: 10,
          maxPrice: 20 
        }
    );

    console.log("Search response received:", JSON.stringify(response, null, 2));

    if (response && response.success === true && !response.error) {
      console.log("Search API test PASSED!");
      return true;
    } else {
      console.error("Search API test FAILED. Response did not indicate success or contained an error.");
      console.error("Full response:", response);
      return false;
    }
  } catch (error) {
    console.error("Search API test FAILED due to an exception:", error);
    return false;
  }
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

  if (allTestsPassed) {
    console.log("\n=== All integration tests PASSED! ===");
    process.exit(0);
  } else {
    console.error("\n=== Some integration tests FAILED ===");
    process.exit(1);
  }
}

runTest(); 