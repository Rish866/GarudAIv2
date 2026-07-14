// Edge Function: revoke-organization-invite
// Revokes a pending invitation.

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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { invitation_id } = await req.json()
    if (!invitation_id) return new Response(JSON.stringify({ error: 'invitation_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Get invitation
    const { data: invite } = await supabaseAdmin
      .from('organization_invitations')
      .select('id, organization_id, email, status')
      .eq('id', invitation_id)
      .single()

    if (!invite) return new Response(JSON.stringify({ error: 'Invitation not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Verify caller is owner/admin
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('organization_id', invite.organization_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership || !['organization_owner', 'admin'].includes(membership.role)) {
      return new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (invite.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Only pending invitations can be revoked' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Revoke
    await supabaseAdmin
      .from('organization_invitations')
      .update({ status: 'revoked', revoked_by: user.id, revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', invitation_id)

    // Audit
    await supabaseAdmin.from('activity_log').insert({
      organization_id: invite.organization_id,
      user_id: user.id,
      action: 'invitation_revoked',
      entity_type: 'organization_invitation',
      entity_id: invitation_id,
      details: `Revoked invitation for ${invite.email}`,
    })

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch {
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
