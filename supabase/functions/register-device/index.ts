import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Device limits per plan
const DEVICE_LIMITS: Record<string, number> = {
  dev_unlimited: 100,
  beta_premium: 4,
  premium: 4,
  free: 2,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create client with user's auth to get their identity
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { device_id, device_label, revoke_others } = await req.json();
    if (!device_id || typeof device_id !== 'string') {
      return new Response(JSON.stringify({ error: 'device_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for database operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's plan from profiles
    const { data: profile } = await adminClient
      .from('profiles')
      .select('plan')
      .eq('user_id', user.id)
      .single();

    const plan = profile?.plan || 'free';
    const deviceLimit = DEVICE_LIMITS[plan] || DEVICE_LIMITS.free;

    // Get active devices for this user
    const { data: activeDevices, error: devicesError } = await adminClient
      .from('user_devices')
      .select('*')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .order('last_seen_at', { ascending: true });

    if (devicesError) {
      console.error('Error fetching devices:', devicesError);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const currentDevices = activeDevices || [];
    const existingDevice = currentDevices.find(d => d.device_id === device_id);

    // Handle revoke_others request
    if (revoke_others) {
      const devicesToRevoke = currentDevices.filter(d => d.device_id !== device_id);
      for (const device of devicesToRevoke) {
        await adminClient
          .from('user_devices')
          .update({ revoked_at: new Date().toISOString() })
          .eq('id', device.id);
        
        console.log(`Revoked device ${device.device_id} for user ${user.id} (user requested)`);
      }

      // Make sure current device is registered
      if (!existingDevice) {
        await adminClient
          .from('user_devices')
          .upsert({
            user_id: user.id,
            device_id,
            device_label: device_label || null,
            last_seen_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,device_id',
          });
      }

      // Fetch updated list
      const { data: updatedDevices } = await adminClient
        .from('user_devices')
        .select('*')
        .eq('user_id', user.id)
        .is('revoked_at', null)
        .order('last_seen_at', { ascending: false });

      return new Response(JSON.stringify({
        success: true,
        devices: updatedDevices || [],
        limit: deviceLimit,
        plan,
        revoked_count: devicesToRevoke.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If this device is already registered, just update last_seen
    if (existingDevice) {
      await adminClient
        .from('user_devices')
        .update({ last_seen_at: new Date().toISOString(), device_label: device_label || existingDevice.device_label })
        .eq('id', existingDevice.id);

      // Fetch updated list
      const { data: updatedDevices } = await adminClient
        .from('user_devices')
        .select('*')
        .eq('user_id', user.id)
        .is('revoked_at', null)
        .order('last_seen_at', { ascending: false });

      return new Response(JSON.stringify({
        success: true,
        devices: updatedDevices || [],
        limit: deviceLimit,
        plan,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // New device - check if we're over limit
    const otherDevicesCount = currentDevices.length;
    
    if (otherDevicesCount >= deviceLimit) {
      // Revoke oldest device(s) to make room
      const devicesToRevoke = currentDevices.slice(0, otherDevicesCount - deviceLimit + 1);
      
      for (const device of devicesToRevoke) {
        await adminClient
          .from('user_devices')
          .update({ revoked_at: new Date().toISOString() })
          .eq('id', device.id);
        
        console.log(`Revoked device ${device.device_id} for user ${user.id} (over limit)`);
      }
    }

    // Insert new device
    const { error: insertError } = await adminClient
      .from('user_devices')
      .upsert({
        user_id: user.id,
        device_id,
        device_label: device_label || null,
        last_seen_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,device_id',
      });

    if (insertError) {
      console.error('Error inserting device:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to register device' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch final list
    const { data: finalDevices } = await adminClient
      .from('user_devices')
      .select('*')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .order('last_seen_at', { ascending: false });

    console.log(`Registered device ${device_id} for user ${user.id}, plan: ${plan}, limit: ${deviceLimit}`);

    return new Response(JSON.stringify({
      success: true,
      devices: finalDevices || [],
      limit: deviceLimit,
      plan,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('register-device error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
