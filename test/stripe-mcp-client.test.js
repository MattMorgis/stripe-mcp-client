import {jest} from '@jest/globals';
import StripeMcpClient from '../src/stripe-mcp-client.js';

// Mock the MCP SDK client
jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    callTool: jest.fn().mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            id: 'plink_1234',
            object: 'payment_link',
            url: 'https://checkout.stripe.com/pay/cs_test_123456789',
            created: 1612312000,
          }),
        },
      ],
    }),
    listTools: jest.fn().mockResolvedValue({
      tools: [{name: 'paymentLinks.create'}],
    }),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock the transport
jest.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: jest.fn().mockImplementation(() => ({})),
}));

describe('StripeMcpClient', () => {
  let originalEnv;
  let client;

  beforeEach(() => {
    originalEnv = {...process.env};
    process.env.STRIPE_API_KEY = 'test_api_key';
    client = new StripeMcpClient({debug: false});
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  test('constructor throws error if no API key is provided', () => {
    delete process.env.STRIPE_API_KEY;
    expect(() => new StripeMcpClient()).toThrow('Stripe API key is required');
  });

  test('connect initializes the client and transport', async () => {
    await client.connect();
    expect(client.connected).toBe(true);
  });

  test('createPaymentLink calls the correct tool with arguments', async () => {
    const paymentLinkOptions = {
      line_items: [
        {
          price: 'price_123',
          quantity: 1,
        },
      ],
    };

    await client.connect();
    const result = await client.createPaymentLink(paymentLinkOptions);

    expect(client.client.callTool).toHaveBeenCalledWith({
      name: 'paymentLinks.create',
      arguments: paymentLinkOptions,
    });

    expect(result).toEqual({
      id: 'plink_1234',
      object: 'payment_link',
      url: 'https://checkout.stripe.com/pay/cs_test_123456789',
      created: 1612312000,
    });
  });

  test('close properly cleans up the client', async () => {
    await client.connect();
    await client.close();

    expect(client.client.close).toHaveBeenCalled();
    expect(client.connected).toBe(false);
  });
});
