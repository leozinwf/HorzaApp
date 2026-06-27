import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Configuração de CORS para permitir que o teu site React (Front-end) chame esta função
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Lidar com a requisição inicial (Preflight) do navegador
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Receber os dados enviados pelo React
    const { code, barbeariaId } = await req.json()

    // 2. Pegar na Chave Secreta da Stripe que estará guardada em segurança no Supabase
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    
    if (!stripeSecretKey) {
      throw new Error('Chave secreta da Stripe não configurada no servidor.')
    }

    // 3. Fazer a troca: Enviar o 'code' para a Stripe e pedir o ID da conta do Barbeiro
    const stripeResponse = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_secret: stripeSecretKey,
        code: code,
        grant_type: 'authorization_code'
      })
    })

    const stripeData = await stripeResponse.json()
    
    // Se a Stripe der erro (ex: código expirado)
    if (stripeData.error) {
      throw new Error(stripeData.error_description || 'Erro ao conectar com a Stripe.')
    }

    const stripeAccountId = stripeData.stripe_user_id

    // 4. Guardar o ID retornado na tua Base de Dados (Tabela barbearias)
    // Usamos a SERVICE_ROLE_KEY para ter permissão máxima e contornar o RLS de forma segura no Back-end
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: dbError } = await supabaseAdmin
      .from('barbearias')
      .update({ 
        stripe_account_id: stripeAccountId,
        gateway_pagamento: 'stripe'
      })
      .eq('id', barbeariaId)

    if (dbError) throw dbError

    // 5. Devolver sucesso para o React!
    return new Response(
      JSON.stringify({ success: true, stripeAccountId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    // Em caso de erro, devolve o problema para o front-end exibir
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})