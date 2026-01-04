import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supported payment gateways
const GATEWAYS = {
  click: {
    baseUrl: 'https://api.click.uz',
  },
  payme: {
    baseUrl: 'https://checkout.paycom.uz/api',
  },
} as const;

type Gateway = keyof typeof GATEWAYS;

interface ProxyRequest {
  gateway: Gateway;
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIXIE_URL = Deno.env.get('FIXIE_URL');
    
    if (!FIXIE_URL) {
      console.error('FIXIE_URL secret is not configured');
      return new Response(
        JSON.stringify({ error: 'Payment proxy not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: ProxyRequest = await req.json();
    const { gateway, endpoint, method = 'POST', headers = {}, body } = requestData;

    // Validate gateway
    if (!gateway || !GATEWAYS[gateway]) {
      return new Response(
        JSON.stringify({ error: 'Invalid gateway. Supported: click, payme' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Endpoint is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gatewayConfig = GATEWAYS[gateway];
    const targetUrl = `${gatewayConfig.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    console.log(`[payment-proxy] Routing ${method} request to ${gateway}: ${targetUrl}`);

    // Create HTTP client with Fixie proxy
    const proxyClient = Deno.createHttpClient({
      proxy: { url: FIXIE_URL }
    });

    // Make the proxied request
    const response = await fetch(targetUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      client: proxyClient,
    });

    const responseData = await response.text();
    
    console.log(`[payment-proxy] Response from ${gateway}: ${response.status}`);

    // Try to parse as JSON, otherwise return as text
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseData);
    } catch {
      parsedResponse = { raw: responseData };
    }

    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        data: parsedResponse,
      }),
      { 
        status: response.ok ? 200 : response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[payment-proxy] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Payment proxy error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
