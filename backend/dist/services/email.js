"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
let transporter = null;
function getTransporter() {
    if (transporter) {
        return transporter;
    }
    const host = process.env.EMAIL_HOST;
    const port = parseInt(process.env.EMAIL_PORT || "465", 10);
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const from = process.env.EMAIL_FROM || user;
    if (!host || !user || !pass) {
        throw new Error("Email configuration is missing. Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS environment variables.");
    }
    transporter = nodemailer_1.default.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for other ports
        auth: {
            user,
            pass
        }
    });
    return transporter;
}
async function sendEmail(options) {
    try {
        const transporter = getTransporter();
        const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || "noreply@reisfundacoes.com";
        await transporter.sendMail({
            from,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text || options.html.replace(/<[^>]*>/g, "") // Strip HTML for text version
        });
        console.log(`[Email] Sent email to ${options.to}: ${options.subject}`);
    }
    catch (error) {
        console.error("[Email] Error sending email:", error);
        throw new Error(`Falha ao enviar email: ${error?.message || "Erro desconhecido"}`);
    }
}
async function sendPasswordResetEmail(email, resetToken, clientName) {
    const resetUrl = `${process.env.FRONTEND_ORIGIN?.split(",")[0] || "https://www.reisfundacoes.com"}/reset-password?token=${resetToken}`;
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
