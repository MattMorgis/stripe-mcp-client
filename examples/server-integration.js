import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import StripeMcpClient from '../src/stripe-mcp-client.js';
import {z} from 'zod';

/**
 * Example MCP server that includes a tool to create Stripe payment links
 *
 * This demonstrates how to integrate the StripeMcpClient into your own MCP server
 */
async function startServer() {
  // Create an MCP server
  const server = new McpServer({
    name: 'Payment Server',
    version: '1.0.0',
  });

  // Add a tool for creating payment links
  server.tool(
    'create_checkout_link',
    'Create a Stripe payment link for a product',
    {
      product_name: z.string().describe('Name of the product'),
      description: z.string().optional().describe('Product description'),
      price_amount: z.number().describe('Price amount in cents'),
      currency: z.string().default('usd').describe('Currency code'),
    },
    async ({product_name, description, price_amount, currency}) => {
      // Initialize the Stripe MCP client
      const stripeClient = new StripeMcpClient();

      try {
        await stripeClient.connect();

        // Create a payment link using the Stripe MCP server
        const paymentLink = await stripeClient.createPaymentLink({
          line_items: [
            {
              price_data: {
                currency: currency,
                product_data: {
                  name: product_name,
                  description: description || undefined,
                },
                unit_amount: price_amount,
              },
              quantity: 1,
            },
          ],
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  payment_link_url: paymentLink.url,
                  payment_link_id: paymentLink.id,
                  created: new Date(paymentLink.created * 1000).toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        console.error('Error creating payment link:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error creating payment link: ${error.message}`,
            },
          ],
          isError: true,
        };
      } finally {
        await stripeClient.close();
      }
    }
  );

  // Start the server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.log('Payment server started');
}

// Run the server if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default startServer;
