const SibApiV3Sdk = require('sib-api-v3-sdk');

// Configurar la API de Brevo
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key']; 
apiKey.apiKey = process.env.BREVO_API_KEY;
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

/**
 * Envía un email usando Brevo.
 * @param {string} to - Email del destinatario.
 * @param {string} subject - Asunto del email.
 * @param {string} text - Contenido en texto plano.
 * @param {string} html - Contenido en HTML.
 */
const sendEmail = async (to, subject, text, html) => {
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = html;
  sendSmtpEmail.textContent = text;
  sendSmtpEmail.sender = { 
    name: process.env.BREVO_FROM_NAME, 
    email: process.env.BREVO_FROM_EMAIL 
  };
  sendSmtpEmail.to = [{ email: to }];

  try {
    console.log("Enviando email a:", to);
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("Email enviado, respuesta:", data);
    return data;
  } catch (error) {
    console.error("Error al enviar email con Brevo:", error.message);
    throw new Error("Error al enviar el email de verificación");
  }
};

/**
 * Envía un código de verificación de soporte.
 * (Esta función no cambia su lógica, solo el servicio que usa 'sendEmail')
 */
const sendSupportVerificationCode = async (email, code) => {
  const subject = `Tu código de verificación de Soporte Busquidy`;
  const text = `Hola,\n\nTu código para acceder al soporte es: ${code}\nEste código expira en 10 minutos.\n\nSi no solicitaste esto, puedes ignorar este email.\n\nEl equipo de Busquidy`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Hola,</h2>
      <p>Tu código para acceder al soporte de Busquidy es:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0; padding: 10px; background-color: #f4f4f4; text-align: center;">
        ${code}
      </p>
      <p>Este código expira en 10 minutos.</p>
      <p>Si no solicitaste esto, puedes ignorar este email.</p>
      <br>
      <p>El equipo de Busquidy</p>
    </div>
  `;

  return sendEmail(email, subject, text, html);
};

module.exports = {
  sendEmail,
  sendSupportVerificationCode,
};