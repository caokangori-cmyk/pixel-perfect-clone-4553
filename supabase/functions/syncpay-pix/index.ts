const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYNCPAY_BASE_URL = "https://api.syncpayments.com.br";

async function getAuthToken(): Promise<string> {
  const clientId = Deno.env.get("SYNCPAY_CLIENT_ID");
  const clientSecret = Deno.env.get("SYNCPAY_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("SyncPay credentials not configured");
  }

  const res = await fetch(`${SYNCPAY_BASE_URL}/api/partner/v1/auth-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("SyncPay auth error:", data);
    throw new Error("Failed to authenticate with SyncPay");
  }

  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // GET = check status
    if (req.method === "GET") {
      const url = new URL(req.url);
      const identifier = url.searchParams.get("identifier");

      if (!identifier) {
        return new Response(
          JSON.stringify({ error: "identifier is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const token = await getAuthToken();

      const res = await fetch(
        `${SYNCPAY_BASE_URL}/api/partner/v1/transaction/${identifier}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("SyncPay status error:", data);
        return new Response(
          JSON.stringify({ error: "Failed to check transaction status" }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ status: data.data?.status || "pending" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST = create PIX
    if (req.method === "POST") {
      const body = await req.json();
      const { amount } = body; // amount in cents

      if (!amount || amount < 600) {
        return new Response(
          JSON.stringify({ error: "Valor mínimo de R$ 6,00" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const amountReais = amount / 100;

      const token = await getAuthToken();

      const cashInRes = await fetch(
        `${SYNCPAY_BASE_URL}/api/partner/v1/cash-in`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            amount: amountReais,
            description: "Doação Instituto Viver",
            client: {
              name: "Doador Anônimo",
              cpf: "00000000000",
              email: "doador@exemplo.com",
              phone: "00000000000",
            },
          }),
        }
      );

      const cashInData = await cashInRes.json();

      if (!cashInRes.ok) {
        console.error("SyncPay cash-in error:", cashInData);
        return new Response(
          JSON.stringify({ error: cashInData.message || "Erro ao gerar PIX" }),
          { status: cashInRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          pixCode: cashInData.pix_code,
          identifier: cashInData.identifier,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
