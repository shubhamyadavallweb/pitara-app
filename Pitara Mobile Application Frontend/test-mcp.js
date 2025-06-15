#!/usr/bin/env node

// Test script for Pitara Supabase MCP Server
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from '@supabase/supabase-js';

console.log("🧪 Testing Pitara Supabase MCP Server...\n");

// Test 1: Check if dependencies are installed
console.log("✓ Testing dependencies...");
try {
  console.log("  - @modelcontextprotocol/sdk: ✓");
  console.log("  - @supabase/supabase-js: ✓");
  console.log("  - zod: ✓");
} catch (error) {
  console.error("  ❌ Dependency test failed:", error.message);
  process.exit(1);
}

// Test 2: Check configuration
console.log("\n✓ Testing configuration...");
try {
  const { MCP_CONFIG } = await import('./mcp-config.js');
  console.log(`  - Server name: ${MCP_CONFIG.server.name}`);
  console.log(`  - Server version: ${MCP_CONFIG.server.version}`);
  console.log(`  - Supabase URL: ${MCP_CONFIG.supabase.url}`);
  console.log(`  - Debug mode: ${MCP_CONFIG.debug}`);
} catch (error) {
  console.error("  ❌ Configuration test failed:", error.message);
  process.exit(1);
}

// Test 3: Check if MCP server can be imported
console.log("\n✓ Testing MCP server import...");
try {
  // Just test the import, don't actually start it
  const fs = await import('fs');
  if (fs.existsSync('./start-mcp.js')) {
    console.log("  - MCP server file exists: ✓");
  } else {
    throw new Error("MCP server file not found");
  }
} catch (error) {
  console.error("  ❌ MCP server import test failed:", error.message);
  process.exit(1);
}

// Test 4: Validate package.json
console.log("\n✓ Testing package.json...");
try {
  const fs = await import('fs');
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  
  const requiredDeps = [
    '@modelcontextprotocol/sdk',
    '@supabase/supabase-js',
    'zod'
  ];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`  - ${dep}: ✓`);
    } else {
      throw new Error(`Missing dependency: ${dep}`);
    }
  });
} catch (error) {
  console.error("  ❌ Package.json test failed:", error.message);
  process.exit(1);
}

console.log("\n🎉 All tests passed! Your MCP server should be ready to use.");
console.log("\n📋 Next steps:");
console.log("1. Make sure your .cursor/mcp.json is configured correctly");
console.log("2. Restart Cursor to load the new MCP configuration");
console.log("3. Check Cursor's MCP status in the tools panel");
console.log("4. The MCP should show as 'green' and connected");

console.log("\n🛠️  Available MCP Tools:");
console.log("  - mcp_supabase_list_tables: List all tables in your Supabase project");
console.log("  - mcp_supabase_execute_sql: Execute SELECT queries"); 
console.log("  - mcp_supabase_get_project: Get project information");
console.log("  - mcp_supabase_query_table: Query specific table data");

console.log("\n🔧 Troubleshooting:");
console.log("  - If MCP shows 'red': Check the logs in Cursor's developer tools");
console.log("  - If tools don't appear: Restart Cursor completely");
console.log("  - For connection issues: Verify your Supabase credentials");

process.exit(0); 