import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Web Push utilities
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  let binary = '';
  for (const byte of arr) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateVapidAuth(endpoint: string, vapidPublicKey: string, vapidPrivateKey: string) {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60;

  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud: audience, exp: expiration, sub: 'mailto:hello@savo.co.nz' };

  const headerB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key
  const privateKeyBytes = base64UrlToUint8Array(vapidPrivateKey);
  const publicKeyBytes = base64UrlToUint8Array(vapidPublicKey);

  // Build the JWK
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: uint8ArrayToBase64Url(publicKeyBytes.slice(1, 33)),
    y: uint8ArrayToBase64Url(publicKeyBytes.slice(33, 65)),
    d: uint8ArrayToBase64Url(privateKeyBytes),
  };

  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsignedToken));

  // Convert DER signature to raw r||s format
  const sigArray = new Uint8Array(signature);
  let r: Uint8Array, s: Uint8Array;
  
  if (sigArray.length === 64) {
    r = sigArray.slice(0, 32);
    s = sigArray.slice(32, 64);
  } else {
    // DER format
    const rLen = sigArray[3];
    const rStart = 4;
    const rBytes = sigArray.slice(rStart, rStart + rLen);
    const sLenIdx = rStart + rLen + 1;
    const sLen = sigArray[sLenIdx];
    const sStart = sLenIdx + 1;
    const sBytes = sigArray.slice(sStart, sStart + sLen);
    
    r = new Uint8Array(32);
    s = new Uint8Array(32);
    r.set(rBytes.length > 32 ? rBytes.slice(rBytes.length - 32) : rBytes, 32 - Math.min(rBytes.length, 32));
    s.set(sBytes.length > 32 ? sBytes.slice(sBytes.length - 32) : sBytes, 32 - Math.min(sBytes.length, 32));
  }

  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0);
  rawSig.set(s, 32);

  const token = `${unsignedToken}.${uint8ArrayToBase64Url(rawSig)}`;

  return {
    authorization: `vapid t=${token}, k=${vapidPublicKey}`,
  };
}

async function encryptPayload(payload: string, p256dhKey: string, authSecret: string) {
  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Generate local key pair
  const localKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const localPublicKey = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKeyBytes = new Uint8Array(localPublicKey);
  
  // Import subscriber public key
  const subscriberPublicKeyBytes = base64UrlToUint8Array(p256dhKey);
  const subscriberPublicKey = await crypto.subtle.importKey('raw', subscriberPublicKeyBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  
  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits({ name: 'ECDH', public: subscriberPublicKey }, localKeyPair.privateKey, 256);
  
  // Import auth secret
  const authSecretBytes = base64UrlToUint8Array(authSecret);
  
  // Derive PRK using auth
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0');
  const ikm = await crypto.subtle.importKey('raw', sharedSecret, { name: 'HKDF' }, false, ['deriveBits']);
  
  const prkBits = await crypto.subtle.deriveBits({
    name: 'HKDF',
    hash: 'SHA-256',
    salt: authSecretBytes,
    info: authInfo,
  }, ikm, 256);
  
  // Build context for key and nonce derivation
  const keyLabel = new TextEncoder().encode('Content-Encoding: aesgcm\0');
  const nonceLabel = new TextEncoder().encode('Content-Encoding: nonce\0');
  
  // Build context buffer  
  const context = new Uint8Array(5 + 1 + 2 + 65 + 1 + 2 + 65);
  const contextLabel = new TextEncoder().encode('P-256');
  context.set(contextLabel, 0);
  context[5] = 0;
  context[6] = 0; context[7] = 65;
  context.set(subscriberPublicKeyBytes, 8);
  context[73] = 0;
  context[74] = 0; context[75] = 65;
  context.set(localPublicKeyBytes, 76);
  
  const keyInfoBuf = new Uint8Array(keyLabel.length + context.length);
  keyInfoBuf.set(keyLabel, 0);
  keyInfoBuf.set(context, keyLabel.length);
  
  const nonceInfoBuf = new Uint8Array(nonceLabel.length + context.length);
  nonceInfoBuf.set(nonceLabel, 0);
  nonceInfoBuf.set(context, nonceLabel.length);
  
  const prkKey = await crypto.subtle.importKey('raw', prkBits, { name: 'HKDF' }, false, ['deriveBits']);
  
  const cekBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: salt, info: keyInfoBuf }, prkKey, 128);
  const nonceBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: salt, info: nonceInfoBuf }, prkKey, 96);
  
  // Encrypt with padding
  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array(2 + payloadBytes.length);
  paddedPayload[0] = 0; paddedPayload[1] = 0;
  paddedPayload.set(payloadBytes, 2);
  
  const cek = await crypto.subtle.importKey('raw', cekBits, { name: 'AES-GCM' }, false, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonceBits }, cek, paddedPayload);
  
  return {
    ciphertext: new Uint8Array(encrypted),
    salt,
    localPublicKey: localPublicKeyBytes,
  };
}

async function sendPush(subscription: { endpoint: string; p256dh: string; auth: string }, payload: object, vapidPublicKey: string, vapidPrivateKey: string) {
  const payloadStr = JSON.stringify(payload);
  
  const { ciphertext, salt, localPublicKey } = await encryptPayload(payloadStr, subscription.p256dh, subscription.auth);
  const { authorization } = await generateVapidAuth(subscription.endpoint, vapidPublicKey, vapidPrivateKey);
  
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': authorization,
      'TTL': '86400',
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aesgcm',
      'Encryption': `salt=${uint8ArrayToBase64Url(salt)}`,
      'Crypto-Key': `dh=${uint8ArrayToBase64Url(localPublicKey)};p256ecdsa=${vapidPublicKey}`,
    },
    body: ciphertext,
  });
  
  return response;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, title, body: msgBody, url, tag } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = 'BOo-qOvBG11PGO37UZBZ15RN0h9cdY1I9Xt3HkNHT204DnQGw53LQ7ucwfC-lggDXLSLG5Fx2hqH0khSF_Y2nxY';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user_id);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No push subscriptions found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = { title, body: msgBody, url: url || '/dashboard', tag: tag || 'savo-reminder', icon: '/app-icon-192.png' };
    
    let sent = 0;
    const errors: string[] = [];

    for (const sub of subs) {
      try {
        const resp = await sendPush(sub, payload, vapidPublicKey, vapidPrivateKey);
        if (resp.status === 201 || resp.status === 200) {
          sent++;
        } else if (resp.status === 404 || resp.status === 410) {
          // Subscription expired, remove it
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        } else {
          errors.push(`Status ${resp.status} for endpoint`);
        }
      } catch (e: unknown) {
        errors.push(e instanceof Error ? e.message : 'Unknown error');
      }
    }

    return new Response(JSON.stringify({ sent, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
