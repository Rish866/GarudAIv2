// Edge Function: accept-organization-invite
// Accepts an invitation token and creates membership.
// This function is called from the /invite/accept route.
// It hashes the raw token and calls the DB RPC.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Not authenticated. Please sign in first.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Verify caller is authenticated
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Invalid session. Please sign in again.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { token } = await req.json()
    if (!token) return new Response(JSON.stringify({ error: 'Invitation token is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Hash the raw token to match stored hash
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(token))
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

    // Call the database RPC (runs as the authenticated user via set_config)
    // We need to set the JWT claim so the RPC sees auth.uid()
    await supabaseAdmin.rpc('set_config', { setting: 'request.jwt.claim.sub', value: user.id })

    const { data, error } = await supabaseAdmin.rpc('accept_organization_invite', {
      p_token_hash: tokenHash,
    })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error processing invitation' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
