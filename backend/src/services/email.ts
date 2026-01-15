import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) {
    console.log("[Email] Using existing transporter");
    return transporter;
  }

  console.log("[Email] Creating new transporter");
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || "465", 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const from = process.env.EMAIL_FROM || user;

  console.log("[Email] Configuration:", {
    host: host || "MISSING",
    port,
    user: user || "MISSING",
    pass: pass ? "***" : "MISSING",
    from: from || "MISSING"
  });

  if (!host || !user || !pass) {
    console.error("[Email] Configuration error: Missing required environment variables");
    throw new Error("Email configuration is missing. Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS environment variables.");
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass
    }
  });

  console.log("[Email] Transporter created successfully");
  return transporter;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    console.log("[Email] sendEmail called:", {
      to: options.to,
      subject: options.subject,
      hasHtml: !!options.html,
      hasText: !!options.text
    });

    const transporter = getTransporter();
    const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || "noreply@reisfundacoes.com";

    console.log("[Email] Sending mail:", {
      from,
      to: options.to,
      subject: options.subject
    });

    const result = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, "") // Strip HTML for text version
    });

    console.log(`[Email] Email sent successfully to ${options.to}: ${options.subject}`);
    console.log("[Email] Send result:", {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected
    });
  } catch (error: any) {
    console.error("[Email] Error sending email:", error);
    console.error("[Email] Error details:", {
      message: error?.message,
      code: error?.code,
      command: error?.command,
      response: error?.response,
      responseCode: error?.responseCode,
      stack: error?.stack
    });
    throw new Error(`Falha ao enviar email: ${error?.message || "Erro desconhecido"}`);
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  clientName: string,
  requestOrigin?: string
): Promise<void> {
  console.log("[Email] sendPasswordResetEmail called:", {
    email,
    clientName,
    tokenLength: resetToken.length,
    tokenPreview: resetToken.substring(0, 10) + "...",
    requestOrigin
  });

  // Determine frontend URL based on environment
  const isDevelopment = process.env.NODE_ENV !== "production";
  let frontendOrigin: string;
  
  if (isDevelopment) {
    frontendOrigin = "http://localhost:5173";
    console.log("[Email] Using development URL:", frontendOrigin);
  } else {
    // In production, prefer request origin if available and valid, otherwise use FRONTEND_ORIGIN or default
    if (requestOrigin && (requestOrigin.includes("reisfundacoes.com") || requestOrigin.includes("localhost"))) {
      // Use the origin from the request (e.g., https://www.reisfundacoes.com)
      // Only use if it's from a trusted domain
      frontendOrigin = requestOrigin;
      console.log("[Email] Using request origin URL:", frontendOrigin);
    } else {
      // Fallback to FRONTEND_ORIGIN or default to production URL
      frontendOrigin = process.env.FRONTEND_ORIGIN?.split(",")[0] || "https://www.reisfundacoes.com";
      console.log("[Email] Using production URL from env/default:", frontendOrigin);
    }
  }
  
  const resetUrl = `${frontendOrigin}/reset-password?token=${resetToken}`;
  console.log("[Email] Reset URL:", resetUrl);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #10b981;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .content {
          background-color: #f9fafb;
          padding: 30px;
          border-radius: 0 0 5px 5px;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background-color: #10b981;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Redefinição de Senha</h1>
        </div>
        <div class="content">
          <p>Olá ${clientName},</p>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
          <p>Clique no botão abaixo para criar uma nova senha:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Redefinir Senha</a>
          </p>
          <p>Ou copie e cole o link abaixo no seu navegador:</p>
          <p style="word-break: break-all; color: #10b981;">${resetUrl}</p>
          <p><strong>Este link expira em 1 hora.</strong></p>
          <p>Se você não solicitou esta redefinição, ignore este email.</p>
        </div>
        <div class="footer">
          <p>Este é um email automático, por favor não responda.</p>
          <p>&copy; ${new Date().getFullYear()} Reis Fundações. Todos os direitos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: "Redefinição de Senha - Reis Fundações",
    html
  });
}

