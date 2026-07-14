// Edge Function: send-organization-invite
// Sends an invitation email to join an organization.
//
// Required secrets (set via Supabase Dashboard > Edge Functions > Secrets):
// - SUPABASE_SERVICE_ROLE_KEY (auto-provided by Supabase)
// - RESEND_API_KEY (for email delivery via Resend.com)
// - APP_URL (e.g., https://garud-a-iv2.vercel.app)

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
    if (!authHeader) return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const appUrl = Deno.env.get('APP_URL') || 'https://garud-a-iv2.vercel.app'

    // Client with caller's JWT (for auth validation)
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })

    // Service role client (for admin operations)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Get caller identity
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) return new Response(JSON.stringify({ error: 'Invalid authentication' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // 2. Parse request body
    const { organization_id, email, role, branch_ids, has_all_branch_access } = await req.json()

    if (!organization_id || !email || !role) {
      return new Response(JSON.stringify({ error: 'organization_id, email, and role are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Verify caller is owner/admin of the organization
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('id, role')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership || !['organization_owner', 'admin'].includes(membership.role)) {
      return new Response(JSON.stringify({ error: 'Permission denied: only owners/admins can invite' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 4. Prevent non-owner from assigning owner role
    if (role === 'organization_owner' && membership.role !== 'organization_owner') {
      return new Response(JSON.stringify({ error: 'Only the organization owner can assign the owner role' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 5. Check for duplicate active invitation
    const { data: existing } = await supabaseAdmin
      .from('organization_invitations')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .single()

    if (existing) {
      return new Response(JSON.stringify({ error: 'An active invitation already exists for this email' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 5b. Validate branch_ids belong to the same organization
    if (branch_ids && branch_ids.length > 0) {
      const { count } = await supabaseAdmin
        .from('branches')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organization_id)
        .in('id', branch_ids)
      if (count !== branch_ids.length) {
        return new Response(JSON.stringify({ error: 'One or more branch IDs do not belong to this organization' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // 6. Generate cryptographically secure token
    const tokenBytes = new Uint8Array(32)
    crypto.getRandomValues(tokenBytes)
    const rawToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('')

    // 7. Hash the token (SHA-256)
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawToken))
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

    // 8. Store invitation with hash only
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const { data: invitation, error: insertError } = await supabaseAdmin
      .from('organization_invitations')
      .insert({
        organization_id,
        email: email.toLowerCase(),
        role,
        token_hash: tokenHash,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        invited_by: user.id,
        branch_ids: branch_ids || [],
        has_all_branch_access: has_all_branch_access || false,
      })
      .select('id')
      .single()

    if (insertError) {
      return new Response(JSON.stringify({ error: 'Failed to create invitation: ' + insertError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 9. Get organization name for email
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', organization_id)
      .single()

    // 10. Send email (using Resend or fallback)
    const acceptUrl = `${appUrl}/invite/accept?token=${rawToken}`
    let emailSent = false

    if (resendApiKey) {
      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Garud AI <noreply@garudai.com>',
            to: [email.toLowerCase()],
            subject: `You're invited to join ${org?.name || 'an organization'} on Garud AI`,
            html: `
              <h2>You've been invited!</h2>
              <p><strong>${user.email}</strong> has invited you to join <strong>${org?.name || 'their organization'}</strong> as <strong>${role.replace(/_/g, ' ')}</strong>.</p>
              <p>This invitation expires on ${expiresAt.toLocaleDateString()}.</p>
              <p><a href="${acceptUrl}" style="background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin-top:16px;">Accept Invitation</a></p>
              <p style="margin-top:16px;color:#64748b;font-size:12px;">If you didn't expect this invitation, you can safely ignore it.</p>
            `,
          }),
        })
        emailSent = emailRes.ok
      } catch { emailSent = false }
    }

    // 11. Audit log
    await supabaseAdmin.from('activity_log').insert({
      organization_id,
      user_id: user.id,
      action: 'invitation_sent',
      entity_type: 'organization_invitation',
      entity_id: invitation.id,
      details: `Invited ${email} as ${role}`,
      metadata: { email, role, expires_at: expiresAt.toISOString() },
    })

    return new Response(JSON.stringify({
      success: true,
      invitation_id: invitation.id,
      email_sent: emailSent,
      expires_at: expiresAt.toISOString(),
      // Include accept URL only for development/testing (remove in production)
      ...(Deno.env.get('ENVIRONMENT') !== 'production' ? { accept_url: acceptUrl } : {}),
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
