require('dotenv').config();
const { Valyu } = require('../dist/index.js');

async function runAnswerExamples() {
  console.log("Valyu Answer API Examples");
  console.log("=====================================\n");

  const apiKey = process.env.VALYU_API_KEY;
  if (!apiKey) {
    console.error("VALYU_API_KEY environment variable is not set.");
    process.exit(1);
  }

  const valyu = new Valyu(apiKey);

  // Basic answer request
  console.log("💬 Basic Answer:");
  try {
    const response = await valyu.answer("What are the latest developments in quantum computing?");
    console.log(response);
  } catch (error) {
    console.error("Basic answer failed:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Answer with system instructions
  console.log("📋 Answer with System Instructions:");
  try {
    const response = await valyu.answer(
      "Explain neural networks",
      {
        systemInstructions: "You are a computer science professor. Explain concepts clearly with examples.",
        searchType: "proprietary",
        dataMaxPrice: 25.0
      }
    );
    console.log(response);
  } catch (error) {
    console.error("Answer with system instructions failed:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Structured output answer
  console.log("🏗️ Structured Output Answer:");
  try {
    const schema = {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "Brief summary of the topic"
        },
        key_points: {
          type: "array",
          items: {
            type: "string"
          },
          description: "List of key points"
        },
        implications: {
          type: "string",
          description: "Future implications or significance"
        }
      },
      required: ["summary", "key_points", "implications"]
    };

    const response = await valyu.answer(
      "What is the impact of AI on software development?",
      {
        structuredOutput: schema,
        searchType: "all",
        dataMaxPrice: 40.0
      }
    );
    console.log(response);
  } catch (error) {
    console.error("Structured output answer failed:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Answer with source filtering
  console.log("🎯 Answer with Source Filtering:");
  try {
    const response = await valyu.answer(
      "What are the best practices for React performance optimization?",
      {
        searchType: "web",
        includedSources: ["react.dev", "developer.mozilla.org"],
        excludedSources: ["stackoverflow.com"],
        startDate: "2024-01-01",
        dataMaxPrice: 35.0
      }
    );
    console.log(response);
  } catch (error) {
    console.error("Answer with source filtering failed:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Answer with country filter
  console.log("🌍 Answer with Country Filter:");
  try {
    const response = await valyu.answer(
      "What are the current renewable energy policies?",
      {
        countryCode: "US",
        startDate: "2024-06-01",
        systemInstructions: "Focus on recent policy changes and their practical implications.",
        dataMaxPrice: 30.0
      }
    );
    console.log(response);
  } catch (error) {
    console.error("Answer with country filter failed:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Complex research query
  console.log("🔬 Complex Research Query:");
  try {
    const response = await valyu.answer(
      "Compare the effectiveness of different machine learning approaches for natural language processing tasks",
      {
        searchType: "proprietary",
        systemInstructions: "Provide a comprehensive academic analysis with specific metrics and comparisons where available.",
        startDate: "2023-01-01",
        dataMaxPrice: 50.0
      }
    );
    console.log(response);
  } catch (error) {
    console.error("Complex research query failed:", error.message);
  }
}

runAnswerExamples().catch(console.error);
