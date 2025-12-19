/**
 * Claude Skill Entry Point for Valyy
 * 
 * This file serves as the main entry point for the Claude skill.
 * It exports the tool call handler that Claude will invoke.
 */

import { handleToolCall } from "./claude-skill";

/**
 * Main handler function for Claude skill tool calls
 * 
 * @param toolName - The name of the tool being called
 * @param parameters - The parameters for the tool call
 * @returns The result of the tool call
 */
export async function handler(toolName: string, parameters: Record<string, any>): Promise<any> {
  return handleToolCall(toolName, parameters);
}

// Default export for compatibility
export default handler;
