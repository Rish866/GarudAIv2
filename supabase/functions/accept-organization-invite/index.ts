// Edge Function: accept-organization-invite
// Accepts an invitation token and creates membership.
// Uses service role to bypass RLS for the acceptance operation.
// The raw token is hashed client-side before sending; we hash it again here
// to match the stored hash (double-hash is intentional for defense-in-depth).
// Actually: frontend sends raw token, we hash it here to match DB hash.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_URL') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    // 1. Authenticate caller
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Please sign in to accept the invitation.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Validate caller's JWT
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Invalid session. Please sign in again.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // 2. Get token from request
    const { token } = await req.json()
    if (!token || typeof token !== 'string' || token.length < 32) {
      return new Response(JSON.stringify({ error: 'Invalid invitation token' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Hash the raw token to match stored hash
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(token))
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

    // 4. Use service role client to call the accept RPC
    // We set the JWT claim so the RPC's auth.uid() returns the correct user
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      db: { schema: 'public' },
      global: {
        headers: {
          // Pass the user's ID so auth.uid() works inside the RPC
          Authorization: authHeader,
        }
      }
    })

    // Call the database RPC directly
    const { data, error } = await supabaseAdmin.rpc('accept_organization_invite', {
      p_token_hash: tokenHash,
    })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // The RPC returns a JSON object
    const result = data as Record<string, unknown>
    return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error processing invitation' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
