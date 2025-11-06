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

/**
 * Envía un correo con el enlace de recuperación de contraseña
 * @param {string} email - Email del destinatario
 * @param {string} resetToken - Token de reseteo (sin hashear)
 */
const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const subject = `Recuperación de Contraseña - Busquidy`;
  
  const text = `Hola,\n\nRecibimos una solicitud para restablecer tu contraseña en Busquidy.\n\nHaz clic en el siguiente enlace para crear una nueva contraseña:\n${resetUrl}\n\nEste enlace expirará en 15 minutos por seguridad.\n\nSi no solicitaste este cambio, puedes ignorar este correo. Tu contraseña actual permanecerá segura.\n\nSaludos,\nEl equipo de Busquidy`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background: linear-gradient(135deg, #07767c 0%, #055a5f 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Busquidy</h1>
      </div>
      
      <div style="background-color: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-top: 0;">Recuperación de Contraseña</h2>
        
        <p style="color: #666; line-height: 1.6; font-size: 16px;">
          Hola,
        </p>
        
        <p style="color: #666; line-height: 1.6; font-size: 16px;">
          Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Busquidy</strong>.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="display: inline-block; padding: 15px 40px; background-color: #07767c; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; transition: background-color 0.3s;">
            Restablecer Contraseña
          </a>
        </div>
        
        <p style="color: #666; line-height: 1.6; font-size: 14px;">
          Si el botón no funciona, copia y pega este enlace en tu navegador:
        </p>
        
        <p style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; word-break: break-all; font-size: 13px; color: #555;">
          ${resetUrl}
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee;">
          <p style="color: #999; font-size: 13px; line-height: 1.5;">
            ⏱️ <strong>Este enlace expirará en 15 minutos</strong> por razones de seguridad.
          </p>
          
          <p style="color: #999; font-size: 13px; line-height: 1.5;">
            🔒 Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña actual permanecerá segura.
          </p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© 2024 Busquidy - Conectando talento con oportunidades</p>
      </div>
    </div>
  `;

  return sendEmail(email, subject, text, html);
};

/**
 * Envía un correo con el enlace de verificación de cuenta
 * @param {string} email - Email del destinatario
 * @param {string} verificationToken - Token de verificación (sin hashear)
 */
const sendVerificationEmail = async (email, verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verificar-documentos?token=${verificationToken}`;
  
  const subject = `Verifica tu cuenta y sube tus documentos - Busquidy`;
  
  const text = `Hola,\n\nGracias por registrarte en Busquidy.\n\nPara completar tu registro, verifica tu cuenta y sube los documentos requeridos haciendo clic en el siguiente enlace:\n${verificationUrl}\n\nEste enlace expirará en 1 hora por seguridad.\n\nSi no te registraste en Busquidy, puedes ignorar este correo.\n\nSaludos,\nEl equipo de Busquidy`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background: linear-gradient(135deg, #07767c 0%, #055a5f 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Busquidy</h1>
      </div>
      
      <div style="background-color: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-top: 0;">¡Bienvenido a Busquidy!</h2>
        
        <p style="color: #666; line-height: 1.6; font-size: 16px;">
          Hola,
        </p>
        
        <p style="color: #666; line-height: 1.6; font-size: 16px;">
          Gracias por registrarte en <strong>Busquidy</strong>. Estás a un paso de completar tu registro.
        </p>

        <p style="color: #666; line-height: 1.6; font-size: 16px;">
          Para activar tu cuenta y poder comenzar a usar la plataforma, necesitas verificar tu correo electrónico y subir los documentos requeridos.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="display: inline-block; padding: 15px 40px; background-color: #07767c; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; transition: background-color 0.3s;">
            Verificar y Subir Documentos
          </a>
        </div>
        
        <p style="color: #666; line-height: 1.6; font-size: 14px;">
          Si el botón no funciona, copia y pega este enlace en tu navegador:
        </p>
        
        <p style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; word-break: break-all; font-size: 13px; color: #555;">
          ${verificationUrl}
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee;">
          <p style="color: #999; font-size: 13px; line-height: 1.5;">
            ⏱️ <strong>Este enlace expirará en 1 hora</strong> por razones de seguridad.
          </p>
          
          <p style="color: #999; font-size: 13px; line-height: 1.5;">
            🔒 Si no te registraste en Busquidy, puedes ignorar este correo de forma segura.
          </p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© 2024 Busquidy - Conectando talento con oportunidades</p>
      </div>
    </div>
  `;

  return sendEmail(email, subject, text, html);
};

module.exports = {
  sendEmail,
  sendSupportVerificationCode,
  sendPasswordResetEmail,
  sendVerificationEmail,
};