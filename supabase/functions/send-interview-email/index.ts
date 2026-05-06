import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

type InterviewEmailPayload = {
  email_type?: 'confirmation' | 'cancellation';
  to_email?: string;
  to_name?: string;
  docente_name?: string;
  reserva_fecha?: string;
  reserva_hora?: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL');

    if (!resendApiKey || !fromEmail) {
      return new Response(
        JSON.stringify({ error: 'Faltan RESEND_API_KEY o RESEND_FROM_EMAIL en Supabase secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = (await req.json()) as InterviewEmailPayload;
    const { email_type = 'confirmation', to_email, to_name, docente_name, reserva_fecha, reserva_hora } = payload;

    if (!to_email || !to_name || !docente_name || !reserva_fecha || !reserva_hora) {
      return new Response(
        JSON.stringify({ error: 'Faltan datos obligatorios para enviar el correo.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isCancellation = email_type === 'cancellation';
    const subject = isCancellation
      ? 'Tu entrevista fue cancelada'
      : 'Confirmacion de entrevista agendada';
    const html = isCancellation
      ? `
      <h2>Entrevista cancelada</h2>
      <p>Hola ${to_name},</p>
      <p>Tu entrevista con <strong>${docente_name}</strong> fue cancelada.</p>
      <ul>
        <li><strong>Fecha:</strong> ${reserva_fecha}</li>
        <li><strong>Hora:</strong> ${reserva_hora}</li>
      </ul>
      <p>Si fue un error, puedes reagendar desde la plataforma.</p>
      <p>Saludos,<br/>Sistema de entrevistas</p>
    `
      : `
      <h2>Entrevista confirmada</h2>
      <p>Hola ${to_name},</p>
      <p>Tu entrevista con <strong>${docente_name}</strong> fue agendada para:</p>
      <ul>
        <li><strong>Fecha:</strong> ${reserva_fecha}</li>
        <li><strong>Hora:</strong> ${reserva_hora}</li>
      </ul>
      <p>Saludos,<br/>Sistema de entrevistas</p>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to_email],
        subject,
        html
      })
    });

    const resendBody = await resendResponse.text();
    if (!resendResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Resend rechazo el correo.', details: resendBody }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Error interno enviando correo.', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
