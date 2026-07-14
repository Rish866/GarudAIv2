// Edge Function: resend-organization-invite
// Resends invitation email with a new token. Increments send_count.

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
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const appUrl = Deno.env.get('APP_URL') || 'https://garud-a-iv2.vercel.app'

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
      .select('*')
      .eq('id', invitation_id)
      .single()

    if (!invite) return new Response(JSON.stringify({ error: 'Invitation not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Verify permission
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
      return new Response(JSON.stringify({ error: 'Only pending invitations can be resent' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Resend cooldown: minimum 60 seconds between resends
    const lastSent = new Date(invite.last_sent_at).getTime()
    const now = Date.now()
    const cooldownMs = 60 * 1000 // 60 seconds
    if (now - lastSent < cooldownMs) {
      const waitSeconds = Math.ceil((cooldownMs - (now - lastSent)) / 1000)
      return new Response(JSON.stringify({ error: `Please wait ${waitSeconds} seconds before resending` }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Maximum 10 resend attempts
    if (invite.send_count >= 10) {
      return new Response(JSON.stringify({ error: 'Maximum resend attempts reached (10). Please revoke and create a new invitation.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Generate new token
    const tokenBytes = new Uint8Array(32)
    crypto.getRandomValues(tokenBytes)
    const rawToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('')
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawToken))
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

    // Extend expiry
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Update invitation
    await supabaseAdmin
      .from('organization_invitations')
      .update({
        token_hash: tokenHash,
        expires_at: newExpiry.toISOString(),
        last_sent_at: new Date().toISOString(),
        send_count: invite.send_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitation_id)

    // Send email
    const acceptUrl = `${appUrl}/invite/accept?token=${rawToken}`
    let emailSent = false

    if (resendApiKey) {
      const { data: org } = await supabaseAdmin.from('organizations').select('name').eq('id', invite.organization_id).single()
      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Garud AI <noreply@garudai.com>',
            to: [invite.email],
            subject: `Reminder: You're invited to join ${org?.name || 'an organization'} on Garud AI`,
            html: `<h2>Invitation Reminder</h2><p>You've been invited to join <strong>${org?.name}</strong> as <strong>${invite.role.replace(/_/g, ' ')}</strong>.</p><p><a href="${acceptUrl}" style="background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;">Accept Invitation</a></p>`,
          }),
        })
        emailSent = emailRes.ok
      } catch { emailSent = false }
    }

    return new Response(JSON.stringify({
      success: true,
      email_sent: emailSent,
      send_count: invite.send_count + 1,
      expires_at: newExpiry.toISOString(),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch {
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
