// MCP Configuration
export const MCP_CONFIG = {
  supabase: {
    url: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'sbp_v0_44e888210441511b26187a11b439a2fc59de92d5'
  },
  server: {
    name: "PitaraSupabase MCP",
    version: "1.0.0",
    description: "MCP server for Supabase database operations for Pitara project"
  },
  debug: process.env.MCP_DEBUG === 'true' || false
}; 