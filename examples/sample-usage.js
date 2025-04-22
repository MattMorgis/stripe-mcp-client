import StripeMcpClient from '../src/stripe-mcp-client.js';

/**
 * This is a sample usage of the StripeMcpClient to create a payment link
 *
 * Make sure to set the STRIPE_API_KEY environment variable or pass it as an option
 */
async function createSamplePaymentLink() {
  // Create a client instance
  const client = new StripeMcpClient({
    // apiKey: 'your_stripe_api_key', // Optional if STRIPE_API_KEY env var is set
    debug: true, // Set to true to see debug logs
  });

  try {
    // Connect to the Stripe MCP server
    await client.connect();

    // Create a payment link
    const paymentLink = await client.createPaymentLink({
      line_items: [
        {
          price: 'price_123', // Replace with an actual Stripe price ID
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: 'https://example.com/thank-you',
        },
      },
    });

    console.log('Created payment link:', paymentLink);
    console.log('Payment link URL:', paymentLink.url);

    // Always close the connection when done
    await client.close();

    return paymentLink;
  } catch (error) {
    console.error('Error:', error.message);
    // Make sure to clean up even if there's an error
    await client.close();
  }
}

// Run the example if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  createSamplePaymentLink().catch(console.error);
}

export default createSamplePaymentLink;
