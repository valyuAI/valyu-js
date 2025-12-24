require("dotenv").config();
const { Valyu } = require("../dist/index.js");

async function runAnswerExamples() {
  console.log("Valyu Answer API Examples");
  console.log("=====================================\n");

  const apiKey = process.env.VALYU_API_KEY;
  if (!apiKey) {
    console.error("VALYU_API_KEY environment variable is not set.");
    process.exit(1);
  }

  const valyu = new Valyu(apiKey);

  // Example 1: Basic answer (non-streaming - default)
  console.log("1. Basic Answer (non-streaming):");
  try {
    const response = await valyu.answer(
      "What are the latest developments in quantum computing?"
    );
    console.log("Success:", response.success);
    if (response.success) {
      console.log("Answer:", response.contents.substring(0, 300) + "...");
      console.log("Sources:", response.search_results.length);
      console.log("Cost: $" + response.cost.total_deduction_dollars.toFixed(4));
    } else {
      console.log("Error:", response.error);
    }
  } catch (error) {
    console.error("Basic answer failed:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 2: Streaming answer
  console.log("2. Streaming Answer:");
  try {
    const stream = await valyu.answer("What is machine learning?", {
      streaming: true,
    });

    let fullAnswer = "";
    let sourcesCount = 0;

    for await (const chunk of stream) {
      if (chunk.type === "search_results") {
        sourcesCount = chunk.search_results.length;
        console.log(`\n[Received ${sourcesCount} sources]`);
      } else if (chunk.type === "content") {
        if (chunk.content) {
          process.stdout.write(chunk.content);
          fullAnswer += chunk.content;
        }
      } else if (chunk.type === "metadata") {
        console.log(
          `\n\n[Metadata] Cost: $${chunk.cost.total_deduction_dollars.toFixed(
            4
          )}`
        );
        console.log(
          `[Metadata] Tokens: ${chunk.ai_usage.input_tokens} in, ${chunk.ai_usage.output_tokens} out`
        );
      } else if (chunk.type === "done") {
        console.log("\n[Stream complete]");
      } else if (chunk.type === "error") {
        console.log(`\n[Error] ${chunk.error}`);
      }
    }
  } catch (error) {
    console.error("Streaming answer failed:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 3: Answer with system instructions
  console.log("3. Answer with System Instructions:");
  try {
    const response = await valyu.answer("Explain neural networks", {
      systemInstructions:
        "You are a computer science professor. Explain concepts clearly with examples.",
      searchType: "web",
      dataMaxPrice: 25.0,
    });
    console.log("Success:", response.success);
    if (response.success) {
      console.log("Answer:", response.contents);
      console.log("AI cost: $" + response.cost.ai_deduction_dollars.toFixed(4));
    } else {
      console.log("Error:", response.error);
    }
  } catch (error) {
    console.error("Answer with system instructions failed:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 4: Structured output answer
  console.log("4. Structured Output Answer:");
  try {
    const schema = {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "Brief summary of the topic",
        },
        key_points: {
          type: "array",
          items: { type: "string" },
          description: "List of key points",
        },
        implications: {
          type: "string",
          description: "Future implications or significance",
        },
      },
      required: ["summary", "key_points", "implications"],
    };

    const response = await valyu.answer(
      "What is the impact of AI on software development?",
      {
        structuredOutput: schema,
        searchType: "all",
        dataMaxPrice: 40.0,
      }
    );
    console.log("Success:", response.success);
    if (response.success) {
      console.log("Data type:", response.data_type);
      console.log("Structured result:", response.contents);
    } else {
      console.log("Error:", response.error);
    }
  } catch (error) {
    console.error("Structured output answer failed:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 5: Streaming with source filtering
  console.log("5. Streaming with Source Filtering:");
  try {
    const stream = await valyu.answer(
      "What are the best practices for React performance optimization?",
      {
        searchType: "web",
        includedSources: ["react.dev", "developer.mozilla.org"],
        excludedSources: ["stackoverflow.com"],
        startDate: "2024-01-01",
        dataMaxPrice: 35.0,
        streaming: true,
      }
    );

    for await (const chunk of stream) {
      if (chunk.type === "search_results") {
        console.log(`\n[Sources found: ${chunk.search_results.length}]`);
        chunk.search_results.slice(0, 3).forEach((source, i) => {
          console.log(`  ${i + 1}. ${source.title.substring(0, 60)}...`);
        });
      } else if (chunk.type === "content") {
        if (chunk.content) {
          process.stdout.write(chunk.content);
        }
      } else if (chunk.type === "metadata") {
        console.log(
          `\n\n[Total characters: ${chunk.search_metadata.total_characters}]`
        );
      } else if (chunk.type === "done") {
        console.log("\n[Complete]");
      }
    }
  } catch (error) {
    console.error("Streaming with filtering failed:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Example 6: Error handling
  console.log("6. Error Handling Example:");
  try {
    const response = await valyu.answer("How does photosynthesis work?", {
      includedSources: ["invalid..domain", "not-a-url"], // Invalid sources
    });
    console.log("Success:", response.success);
    if (!response.success) {
      console.log("Expected error:", response.error);
    }
  } catch (error) {
    console.error("Error handling failed:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  console.log("Answer API examples completed!");
  console.log("\nKey features:");
  console.log("  - streaming: false (default) - Wait for complete response");
  console.log("  - streaming: true - Stream chunks as they're generated");
  console.log("  - Customize responses with systemInstructions");
  console.log("  - Structure output with structuredOutput (JSON schema)");
  console.log("  - Control data sources and costs");
}

runAnswerExamples().catch(console.error);
