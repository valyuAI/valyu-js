const { Valyu } = require("../dist/index.js");

// Initialize the Valyu client
const valyu = new Valyu();

async function demonstrateFastMode() {
  const query = "What is artificial intelligence?";

  console.log("=== Normal Mode (detailed results) ===");
  try {
    const normalResults = await valyu.search(query, {
      maxNumResults: 3,
      fastMode: false, // Explicit normal mode
    });

    if (normalResults.success) {
      console.log(`Query: ${normalResults.query}`);
      console.log(`Results found: ${normalResults.results.length}`);
      console.log(`Total characters: ${normalResults.total_characters}`);
      normalResults.results.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.title}`);
        console.log(`   Content length: ${result.length} characters`);
        console.log(`   Relevance: ${result.relevance_score}`);
      });
    } else {
      console.error("Normal mode search failed:", normalResults.error);
    }
  } catch (error) {
    console.error("Normal mode error:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  console.log("=== Fast Mode (shorter, quicker results) ===");
  try {
    const fastResults = await valyu.search(query, {
      maxNumResults: 3,
      fastMode: true, // Enable fast mode
    });

    if (fastResults.success) {
      console.log(`Query: ${fastResults.query}`);
      console.log(`Results found: ${fastResults.results.length}`);
      console.log(`Total characters: ${fastResults.total_characters}`);
      fastResults.results.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.title}`);
        console.log(`   Content length: ${result.length} characters`);
        console.log(`   Relevance: ${result.relevance_score}`);
      });
    } else {
      console.error("Fast mode search failed:", fastResults.error);
    }
  } catch (error) {
    console.error("Fast mode error:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  console.log("=== Fast Mode Answer API ===");
  try {
    const answerResult = await valyu.answer(query, {
      fastMode: true, // Enable fast mode for answers
      systemInstructions:
        "Provide a concise explanation suitable for a general audience.",
    });

    if (answerResult.success) {
      console.log("AI Answer (Fast Mode):");
      console.log(answerResult.contents);
      console.log(
        `\nNumber of results: ${answerResult.search_metadata.number_of_results}`
      );
      console.log(`Total cost: $${answerResult.cost.total_deduction_dollars}`);
    } else {
      console.error("Fast mode answer failed:", answerResult.error);
    }
  } catch (error) {
    console.error("Fast mode answer error:", error.message);
  }
}

// Run the demonstration
console.log("Fast Mode Feature Demonstration");
console.log("===============================\n");
console.log("Fast mode provides quicker responses with shorter content,");
console.log(
  "ideal for general-purpose queries where speed is preferred over detail.\n"
);

demonstrateFastMode().catch(console.error);
