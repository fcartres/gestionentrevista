import emailjs from '@emailjs/browser';
import { supabase } from './supabase';

/**
 * Servicio de envío de correos electrónicos utilizando EmailJS.
 * Para que funcione, debes configurar las variables en el archivo .env
 */

export const sendProvisionalPasswordEmail = async (email: string, nombre: string, passwordProvisoria: string) => {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  // Parámetros para la plantilla de EmailJS
  const templateParams = {
    to_email: email,
    to_name: nombre,
    message: `Tu cuenta de docente ha sido creada. Tu contraseña provisoria es: ${passwordProvisoria}. Por favor, cámbiala al ingresar.`,
    provisional_password: passwordProvisoria,
  };

  console.log(`Intentando enviar correo real a: ${email}...`);

  try {
    // Si las llaves no están configuradas, avisamos por consola pero simulamos éxito para no bloquear el flujo
    if (serviceId === 'your_service_id' || !serviceId) {
      console.warn('AVISO: EmailJS no está configurado. Configura las llaves en el archivo .env para enviar correos reales.');
      console.log(`
        --- SIMULACIÓN DE CORREO (Configura .env para real) ---
        Para: ${email}
        Password: ${passwordProvisoria}
        ------------------------------------------------------
      `);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return true;
    }

    const response = await emailjs.send(
      serviceId,
      templateId,
      templateParams,
      publicKey
    );

    console.log('Correo enviado exitosamente!', response.status, response.text);
    return true;
  } catch (error) {
    console.error('Error al enviar el correo con EmailJS:', error);
    return false;
  }
};

export const sendInterviewConfirmationEmail = async (
  email: string,
  nombreApoderado: string,
  nombreDocente: string,
  fecha: string,
  hora: string
) => {
  const functionName = import.meta.env.VITE_SUPABASE_EMAIL_FUNCTION_NAME || 'send-interview-email';

  try {
    const { error } = await supabase.functions.invoke(functionName, {
      body: {
        email_type: 'confirmation',
        to_email: email,
        to_name: nombreApoderado,
        docente_name: nombreDocente,
        reserva_fecha: fecha,
        reserva_hora: hora
      }
    });

    if (error) {
      throw error;
    }
    
    console.log('Correo de confirmación enviado por Supabase.');
    return true;
  } catch (error) {
    console.error('Error al enviar el correo de confirmación con Supabase:', error);
    return false;
  }
};

export const sendInterviewCancellationEmail = async (
  email: string,
  nombreApoderado: string,
  nombreDocente: string,
  fecha: string,
  hora: string
) => {
  const functionName = import.meta.env.VITE_SUPABASE_EMAIL_FUNCTION_NAME || 'send-interview-email';

  try {
    const { error } = await supabase.functions.invoke(functionName, {
      body: {
        email_type: 'cancellation',
        to_email: email,
        to_name: nombreApoderado,
        docente_name: nombreDocente,
        reserva_fecha: fecha,
        reserva_hora: hora
      }
    });

    if (error) {
      throw error;
    }

    console.log('Correo de cancelación enviado por Supabase.');
    return true;
  } catch (error) {
    console.error('Error al enviar correo de cancelación con Supabase:', error);
    return false;
  }
};

export const generateProvisionalPassword = (length = 8) => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0, n = charset.length; i < length; ++i) {
    password += charset.charAt(Math.floor(Math.random() * n));
  }
  return password;
};
