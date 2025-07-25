require('dotenv').config();

const { Valyu } = require('../dist/index.js');

async function runTest() {
  console.log("Starting integration test...");

  const apiKey = process.env.VALYU_API_KEY;
  if (!apiKey) {
    console.error("VALYU_API_KEY environment variable is not set.");
    process.exit(1);
  }

  const valyu = new Valyu(apiKey);
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

    console.log("Received response:", JSON.stringify(response, null, 2));

    if (response && response.success === true && !response.error) {
      console.log("Integration test PASSED!");
      process.exit(0);
    } else {
      console.error("Integration test FAILED. Response did not indicate success or contained an error.");
      console.error("Full response:", response);
      process.exit(1);
    }
  } catch (error) {
    console.error("Integration test FAILED due to an exception:", error);
    process.exit(1);
  }
}

runTest(); 