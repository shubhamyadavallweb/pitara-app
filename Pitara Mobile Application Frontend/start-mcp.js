#!/usr/bin/env node

// Pitara Supabase MCP Server
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { MCP_CONFIG } from './mcp-config.js';

// Initialize Supabase client
const supabase = createClient(
  MCP_CONFIG.supabase.url, 
  MCP_CONFIG.supabase.serviceRoleKey
);

// Logging utility
const log = (message) => {
  if (MCP_CONFIG.debug) {
    console.error(`[MCP DEBUG] ${new Date().toISOString()}: ${message}`);
  }
};

// Create the MCP server
const server = new McpServer({
  name: MCP_CONFIG.server.name,
  version: MCP_CONFIG.server.version,
  description: MCP_CONFIG.server.description
});

// List Tables Tool - Lists all tables in the public schema
server.tool(
  "mcp_supabase_list_tables",
  {
    project_id: z.string().describe("The Supabase project ID")
  },
  async ({ project_id }) => {
    try {
      log(`Listing tables for project: ${project_id}`);
      
      // Get tables from information_schema
      const { data, error } = await supabase
        .rpc('get_schema_tables', { schema_name: 'public' })
        .catch(async () => {
          // Fallback method if RPC doesn't exist
          return await supabase
            .from('pg_tables')
            .select('tablename, schemaname')
            .eq('schemaname', 'public');
        });
      
      if (error) {
        log(`Error listing tables: ${error.message}`);
        return {
          content: [{ 
            type: "text", 
            text: `Error listing tables: ${error.message}` 
          }],
          isError: true
        };
      }
      
      const tables = data || [];
      log(`Found ${tables.length} tables`);
      
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify(tables, null, 2) 
        }]
      };
    } catch (error) {
      log(`Exception in list_tables: ${error.message}`);
      return {
        content: [{ 
          type: "text", 
          text: `Error: ${error.message}` 
        }],
        isError: true
      };
    }
  }
);

// Execute SQL Tool - Executes raw SQL queries
server.tool(
  "mcp_supabase_execute_sql", 
  {
    project_id: z.string().describe("The Supabase project ID"),
    query: z.string().describe("The SQL query to execute")
  },
  async ({ project_id, query }) => {
    try {
      log(`Executing SQL for project ${project_id}: ${query.substring(0, 100)}...`);
      
      // For safety, we'll only allow SELECT queries for now
      const trimmedQuery = query.trim().toLowerCase();
      if (!trimmedQuery.startsWith('select')) {
        return {
          content: [{ 
            type: "text", 
            text: "Only SELECT queries are allowed for security reasons" 
          }],
          isError: true
        };
      }
      
      const { data, error } = await supabase.rpc('execute_query', { 
        query_text: query 
      }).catch(async () => {
        // Fallback: try to execute as a direct query if RPC doesn't exist
        throw new Error('Direct SQL execution not available. Please use specific table operations.');
      });
      
      if (error) {
        log(`SQL execution error: ${error.message}`);
        return {
          content: [{ 
            type: "text", 
            text: `SQL Error: ${error.message}` 
          }],
          isError: true
        };
      }
      
      log(`SQL executed successfully, returned ${Array.isArray(data) ? data.length : 1} rows`);
      
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify(data || [], null, 2) 
        }]
      };
    } catch (error) {
      log(`Exception in execute_sql: ${error.message}`);
      return {
        content: [{ 
          type: "text", 
          text: `Error: ${error.message}` 
        }],
        isError: true
      };
    }
  }
);

// Get Project Info Tool
server.tool(
  "mcp_supabase_get_project",
  {
    id: z.string().describe("The project ID")
  },
  async ({ id }) => {
    try {
      log(`Getting project info for: ${id}`);
      
      const projectInfo = {
        id,
        url: MCP_CONFIG.supabase.url,
        status: "active",
        region: "auto-detect",
        mcp_version: MCP_CONFIG.server.version,
        timestamp: new Date().toISOString()
      };
      
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify(projectInfo, null, 2) 
        }]
      };
    } catch (error) {
      log(`Exception in get_project: ${error.message}`);
      return {
        content: [{ 
          type: "text", 
          text: `Error: ${error.message}` 
        }],
        isError: true
      };
    }
  }
);

// Query specific table data
server.tool(
  "mcp_supabase_query_table",
  {
    project_id: z.string().describe("The Supabase project ID"),
    table: z.string().describe("Table name to query"),
    limit: z.number().optional().default(10).describe("Number of rows to return")
  },
  async ({ project_id, table, limit = 10 }) => {
    try {
      log(`Querying table ${table} with limit ${limit}`);
      
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(limit);
      
      if (error) {
        log(`Table query error: ${error.message}`);
        return {
          content: [{ 
            type: "text", 
            text: `Error querying table ${table}: ${error.message}` 
          }],
          isError: true
        };
      }
      
      log(`Successfully queried table ${table}, returned ${data?.length || 0} rows`);
      
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify(data || [], null, 2) 
        }]
      };
    } catch (error) {
      log(`Exception in query_table: ${error.message}`);
      return {
        content: [{ 
          type: "text", 
          text: `Error: ${error.message}` 
        }],
        isError: true
      };
    }
  }
);

// Initialize the server
async function startServer() {
  try {
    const transport = new StdioServerTransport();
    
    log("Pitara Supabase MCP server initializing...");
    log(`Supabase URL: ${MCP_CONFIG.supabase.url}`);
    log(`Server version: ${MCP_CONFIG.server.version}`);
    
    await server.connect(transport);
    log("Pitara Supabase MCP server connected and ready!");
    
  } catch (error) {
    console.error("Error starting MCP server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log("Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on('SIGTERM', () => {
  log("Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

// Start the server
startServer(); 