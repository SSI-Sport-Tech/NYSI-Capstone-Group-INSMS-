/**
 * Email Service - Handles sending verification emails
 * Uses Nodemailer with Gmail (can be adapted for SendGrid, AWS SES, etc.)
 */

import nodemailer from "nodemailer";

// Create transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Use App Password for Gmail
    },
});

/**
 * Send verification code email
 * @param {string} email - Recipient email
 * @param {string} code - 6-digit verification code
 * @param {string} firstName - User's first name
 */
export const sendVerificationEmail = async (email, code, firstName = "User") => {
    const mailOptions = {
        from: {
            name: "NYSI Authentication",
            address: process.env.EMAIL_USER,
        },
        to: email,
        subject: "Your NYSI Login Verification Code",
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        margin: 0;
                        padding: 0;
                        background-color: #f4f4f4;
                    }
                    .container {
                        max-width: 600px;
                        margin: 40px auto;
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        overflow: hidden;
                    }
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 30px 20px;
                        text-align: center;
                        color: white;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 24px;
                        font-weight: 600;
                    }
                    .content {
                        padding: 40px 30px;
                    }
                    .greeting {
                        font-size: 18px;
                        margin-bottom: 20px;
                        color: #333;
                    }
                    .message {
                        font-size: 16px;
                        color: #555;
                        margin-bottom: 30px;
                    }
                    .code-container {
                        background: #f8f9fa;
                        border: 2px dashed #667eea;
                        border-radius: 8px;
                        padding: 25px;
                        text-align: center;
                        margin: 30px 0;
                    }
                    .code-label {
                        font-size: 14px;
                        color: #666;
                        margin-bottom: 10px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .code {
                        font-size: 36px;
                        font-weight: 700;
                        color: #667eea;
                        letter-spacing: 8px;
                        font-family: 'Courier New', monospace;
                    }
                    .expiry {
                        font-size: 14px;
                        color: #dc3545;
                        margin-top: 15px;
                        font-weight: 500;
                    }
                    .security-notice {
                        background: #fff3cd;
                        border-left: 4px solid #ffc107;
                        padding: 15px;
                        margin: 25px 0;
                        font-size: 14px;
                        color: #856404;
                    }
                    .footer {
                        background: #f8f9fa;
                        padding: 20px 30px;
                        text-align: center;
                        font-size: 13px;
                        color: #6c757d;
                        border-top: 1px solid #e9ecef;
                    }
                    .footer a {
                        color: #667eea;
                        text-decoration: none;
                    }
                    @media (max-width: 600px) {
                        .container {
                            margin: 20px 10px;
                        }
                        .content {
                            padding: 30px 20px;
                        }
                        .code {
                            font-size: 28px;
                            letter-spacing: 4px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 NYSI Security</h1>
                    </div>
                    
                    <div class="content">
                        <div class="greeting">
                            Hello ${firstName},
                        </div>
                        
                        <div class="message">
                            You recently requested to log in to your NYSI account. To complete the login process, please use the verification code below:
                        </div>
                        
                        <div class="code-container">
                            <div class="code-label">Your Verification Code</div>
                            <div class="code">${code}</div>
                            <div class="expiry">⏱️ Expires in 10 minutes</div>
                        </div>
                        
                        <div class="security-notice">
                            <strong>⚠️ Security Notice:</strong><br>
                            If you didn't request this code, please ignore this email or contact support if you're concerned about your account security.
                        </div>
                        
                        <div class="message">
                            For your security:
                            <ul style="margin: 10px 0; padding-left: 20px;">
                                <li>Never share this code with anyone</li>
                                <li>NYSI staff will never ask for this code</li>
                                <li>This code is only valid for 10 minutes</li>
                                <li>You have 3 attempts to enter the correct code</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>
                            This is an automated message from the NYSI Authentication System.<br>
                            © ${new Date().getFullYear()} New York Sports Institute. All rights reserved.
                        </p>
                        <p>
                            Need help? <a href="mailto:${process.env.SUPPORT_EMAIL}">Contact Support</a>
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
Hello ${firstName},

Your NYSI verification code is: ${code}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

For security:
- Never share this code with anyone
- NYSI staff will never ask for this code
- This code is only valid for 10 minutes
- You have 3 attempts to enter the correct code

© ${new Date().getFullYear()} New York Sports Institute
        `.trim(),
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Verification email sent:", info.messageId);
        return true;
    } catch (error) {
        console.error("❌ Email sending failed:", error.message);
        throw error;
    }
};

/**
 * Send welcome email (optional)
 * @param {string} email 
 * @param {string} firstName 
 */
export const sendWelcomeEmail = async (email, firstName) => {
    const mailOptions = {
        from: {
            name: "NYSI Team",
            address: process.env.EMAIL_USER,
        },
        to: email,
        subject: "Welcome to NYSI - Your Account is Ready!",
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
                    h1 { margin: 0; font-size: 28px; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Welcome to NYSI!</h1>
                    </div>
                    <div class="content">
                        <h2>Hi ${firstName},</h2>
                        <p>Your account has been successfully created! You can now access the NYSI Supplement Management System.</p>
                        <p><strong>What you can do:</strong></p>
                        <ul>
                            <li>Manage supplement inventory</li>
                            <li>Track athlete profiles</li>
                            <li>Monitor batch testing</li>
                            <li>Access product information</li>
                        </ul>
                        <p>If you have any questions, our support team is here to help.</p>
                        <p>Best regards,<br>The NYSI Team</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("✅ Welcome email sent to:", email);
    } catch (error) {
        console.error("❌ Welcome email failed:", error.message);
    }
};

// Verify email configuration on startup
export const verifyEmailConfig = async () => {
    try {
        await transporter.verify();
        console.log("✅ Email service is configured and ready");
        return true;
    } catch (error) {
        console.error("❌ Email service configuration error:", error.message);
        console.log("⚠️  2FA emails will not be sent. Check EMAIL_USER and EMAIL_PASSWORD in .env");
        return false;
    }
};
