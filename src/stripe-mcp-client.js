import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * A lightweight client for interacting with Stripe's MCP server
 * to create payment links.
 */
class StripeMcpClient {
  constructor(options = {}) {
    this.client = null;
    this.transport = null;
    this.connected = false;
    this.options = {
      apiKey: options.apiKey || process.env.STRIPE_API_KEY,
      tools: options.tools || 'paymentLinks.create',
      stripeAccount: options.stripeAccount || process.env.STRIPE_ACCOUNT,
      debug: options.debug || false,
    };

    if (!this.options.apiKey) {
      throw new Error(
        'Stripe API key is required. Pass it as an option or set STRIPE_API_KEY environment variable.'
      );
    }
  }

  /**
   * Connect to the Stripe MCP server
   */
  async connect() {
    if (this.connected) {
      return;
    }

    try {
      // Build the command args for Stripe's MCP server
      const args = [
        '-y',
        '@stripe/mcp',
        `--tools=${this.options.tools}`,
        `--api-key=${this.options.apiKey}`,
      ];

      // If a connected account is specified, add it to the args
      if (this.options.stripeAccount) {
        args.push(`--stripe-account=${this.options.stripeAccount}`);
      }

      // Create the transport and client
      this.transport = new StdioClientTransport({
        command: 'npx',
        args,
      });

      this.client = new Client({
        name: 'stripe-mcp-client',
        version: '1.0.0',
      });

      // Connect to the server
      await this.client.connect(this.transport);
      this.connected = true;

      if (this.options.debug) {
        console.log('Connected to Stripe MCP server');
        const tools = await this.client.listTools();
        console.log(
          `Available tools: ${tools.tools.map((t) => t.name).join(', ')}`
        );
      }
    } catch (error) {
      throw new Error(
        `Failed to connect to Stripe MCP server: ${error.message}`
      );
    }
  }

  /**
   * Create a payment link using Stripe's MCP server
   *
   * @param {Object} options - Payment link creation options
   * @param {Object[]} options.line_items - Line items for the payment link
   * @param {Object} [options.after_completion] - Actions after completion
   * @param {Object} [options.custom_fields] - Custom fields
   * @param {String} [options.customer_creation] - Customer creation behavior
   * @returns {Promise<Object>} - The created payment link
   */
  async createPaymentLink(options) {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const result = await this.client.callTool({
        name: 'paymentLinks.create',
        arguments: options,
      });

      // Stripe MCP server returns content as an array of text chunks
      // We need to parse the first item which should be JSON
      let responseText = '';
      for (const content of result.content) {
        if (content.type === 'text') {
          responseText += content.text;
        }
      }

      // Try to parse the response as JSON
      try {
        return JSON.parse(responseText);
      } catch (e) {
        // If parsing fails, return the raw text
        return {rawResponse: responseText};
      }
    } catch (error) {
      throw new Error(`Failed to create payment link: ${error.message}`);
    }
  }

  /**
   * Close the connection to the Stripe MCP server
   */
  async close() {
    if (this.client) {
      await this.client.close();
      this.connected = false;
      if (this.options.debug) {
        console.log('Disconnected from Stripe MCP server');
      }
    }
  }
}

export default StripeMcpClient;
