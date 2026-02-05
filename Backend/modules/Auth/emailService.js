/**
 * Mock Email Service (NO EMAIL SERVER REQUIRED)
 * Logs emails to console instead of sending them
 * Perfect for testing without email configuration
 * 
 * USAGE:
 * Change import in controller.js from:
 *   import { sendVerificationEmail } from './emailService.js';
 * To:
 *   import { sendVerificationEmail } from './emailService.mock.js';
 */

/**
 * Mock: Send verification code email (logs to console)
 * @param {string} email - Recipient email
 * @param {string} code - 6-digit verification code
 * @param {string} firstName - User's first name
 */
export async function sendVerificationEmail(email, code, firstName = 'User') {
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('');
    console.log('━'.repeat(70));
    console.log('📧 VERIFICATION EMAIL (MOCK - NOT ACTUALLY SENT)');
    console.log('━'.repeat(70));
    console.log('To:       ', email);
    console.log('Subject:  ', 'Your NYSI Login Verification Code');
    console.log('─'.repeat(70));
    console.log('');
    console.log(`Hello ${firstName},`);
    console.log('');
    console.log('You recently requested to log in to your NYSI account.');
    console.log('To complete the login process, please use the verification code below:');
    console.log('');
    console.log('┌─────────────────────────────────┐');
    console.log('│   YOUR VERIFICATION CODE        │');
    console.log('│                                 │');
    console.log(`│         ${code}              │`);
    console.log('│                                 │');
    console.log('│   ⏱️  Expires in 10 minutes      │');
    console.log('└─────────────────────────────────┘');
    console.log('');
    console.log('⚠️  Security Notice:');
    console.log('If you didn\'t request this code, please ignore this email.');
    console.log('');
    console.log('For your security:');
    console.log('  • Never share this code with anyone');
    console.log('  • NYSI staff will never ask for this code');
    console.log('  • This code is only valid for 10 minutes');
    console.log('  • You have 3 attempts to enter the correct code');
    console.log('');
    console.log('© ' + new Date().getFullYear() + ' New York Sports Institute');
    console.log('━'.repeat(70));
    console.log('');

    return true;
}

/**
 * Mock: Send welcome email (logs to console)
 * @param {string} email 
 * @param {string} firstName 
 */
export async function sendWelcomeEmail(email, firstName) {
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('');
    console.log('━'.repeat(70));
    console.log('📧 WELCOME EMAIL (MOCK - NOT ACTUALLY SENT)');
    console.log('━'.repeat(70));
    console.log('To:       ', email);
    console.log('Subject:  ', 'Welcome to NYSI - Your Account is Ready!');
    console.log('─'.repeat(70));
    console.log('');
    console.log(`🎉 Hi ${firstName},`);
    console.log('');
    console.log('Your account has been successfully created!');
    console.log('You can now access the NYSI Supplement Management System.');
    console.log('');
    console.log('What you can do:');
    console.log('  ✓ Manage supplement inventory');
    console.log('  ✓ Track athlete profiles');
    console.log('  ✓ Monitor batch testing');
    console.log('  ✓ Access product information');
    console.log('');
    console.log('If you have any questions, our support team is here to help.');
    console.log('');
    console.log('Best regards,');
    console.log('The NYSI Team');
    console.log('━'.repeat(70));
    console.log('');

    return true;
}

/**
 * Mock: Verify email configuration (always returns true)
 */
export async function verifyEmailConfig() {
    console.log('');
    console.log('━'.repeat(70));
    console.log('📧 MOCK EMAIL SERVICE');
    console.log('━'.repeat(70));
    console.log('✅ Using console-only email (no actual emails sent)');
    console.log('✅ Verification codes will appear in terminal logs');
    console.log('✅ Perfect for testing without email server');
    console.log('━'.repeat(70));
    console.log('');
    return true;
}

// Log on module load
console.log('🧪 Mock Email Service Loaded - Emails will be logged to console');
