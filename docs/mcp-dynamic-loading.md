# MCP Dynamic Tool Loading (The "Token Diet")

## The Problem: The "Token Tax"
In the Model Context Protocol (MCP), tool definitions are **stateless**. This means that for every single message a user sends, the MCP Client (e.g., Claude Desktop, Antigravity) must prepend the full JSON schema of every available tool to the LLM's prompt.

With a large server like the Browser MCP Server (63+ tools), this creates a significant "Token Tax":
- **Context Bloat**: ~5,000 to 10,000 tokens are consumed per message just for definitions.
- **Cost**: Higher API costs for every turn of the conversation.
- **Memory Loss**: Large toolsets push actual conversation history and code out of the LLM's context window sooner.
- **Noise**: The LLM may become less precise as it has to "look past" 50+ unused tool definitions to find relevant information.

## The Solution: Dynamic Module Loading
Instead of loading all 63 tools at startup, we use a **Lazy Loading** strategy combined with the MCP **Notification** system.

### 0. Capability Negotiation (Handshake)
During the initial connection, the server must explicitly tell the client that it supports tool list updates. This is done in the `initialize` response (see [MCP Specification](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#capabilities)):

```json
{
  "capabilities": {
    "tools": {
      "listChanged": true
    }
  }
}
```
Without this flag, compliant MCP clients may ignore the `notifications/tools/list_changed` event.

### 1. Initial State (The "Lean" Brain)
The server starts by only exposing a small set of "Essential" tools (e.g., navigation, basic interaction, and documentation).
- **Token Count**: ~1,500 tokens.
- **Discovery**: The `browser_manage_modules({ action: 'list' })` tool tells the LLM that other "Power User" capabilities exist but are currently "sleeping."

### 2. Triggering an Upgrade
When the LLM realizes it needs advanced features (like Network Analysis or CPU Profiling), it calls the management tool:
`browser_manage_modules({ action: 'load', module: 'network' })`

### 3. The "Push" Notification (Crucial Step)
After the server loads the new tools into its memory, it must tell the Client that the toolset has changed. It does this by sending a JSON-RPC notification:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/tools/list_changed"
}
```

### 4. The Re-Discovery Loop
1. **Server sends notification** to the Client.
2. **Client receives notification** and realizes its cached tool list is stale.
3. **Client automatically calls** `tools/list` again.
4. **Server returns** the Essential tools + the newly loaded Network tools.
5. **LLM now sees** the new tools in its context for the very next turn.

## Benefits
- **Efficiency**: Users only pay for the "Power User" tools when they actually use them.
- **Context Reclaim**: Reclaims 70-80% of the token tax, leaving more room for code analysis and long-term memory.
- **Performance**: Faster LLM response times due to shorter prompts.

## Implementation Notes
- **Unloading**: The `browser_manage_modules({ action: 'unload', module: '...' })` tool can be used to "prune" the brain if it gets too crowded again.
- **Persistence**: Modules are usually loaded for the duration of the session.
- **User UX**: The transition is invisible to the user; the LLM simply "learns" new skills mid-conversation as needed.
