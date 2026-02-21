import pool from '../config/db.js';

async function populateNamesFromEmails() {
    try {
        console.log('🔄 Populating first_name and last_name from email addresses...');

        // Get all users with NULL names
        const usersResult = await pool.query(`
            SELECT id, email 
            FROM auth.users 
            WHERE first_name IS NULL OR last_name IS NULL
        `);

        console.log(`Found ${usersResult.rows.length} users to update`);

        for (const user of usersResult.rows) {
            const { id, email } = user;
            
            // Extract name from email (before @)
            const emailPrefix = email.split('@')[0];
            
            // Try to split by common delimiters
            let firstName = '';
            let lastName = '';
            
            if (emailPrefix.includes('.')) {
                // Split by dot: john.doe@example.com
                const parts = emailPrefix.split('.');
                firstName = capitalize(parts[0]);
                lastName = capitalize(parts[1] || '');
            } else if (emailPrefix.includes('_')) {
                // Split by underscore: jane_smith@example.com
                const parts = emailPrefix.split('_');
                firstName = capitalize(parts[0]);
                lastName = capitalize(parts[1] || '');
            } else if (emailPrefix.includes('-')) {
                // Split by hyphen: mary-johnson@example.com
                const parts = emailPrefix.split('-');
                firstName = capitalize(parts[0]);
                lastName = capitalize(parts[1] || '');
            } else {
                // No delimiter found, use the whole prefix as first name
                firstName = capitalize(emailPrefix);
                lastName = 'User'; // Default last name
            }

            // Update the user
            await pool.query(`
                UPDATE auth.users 
                SET first_name = $1, last_name = $2 
                WHERE id = $3
            `, [firstName, lastName, id]);

            console.log(`✅ Updated: ${email} -> ${firstName} ${lastName}`);
        }

        console.log('\n🎉 Successfully populated all names!');
        
        // Show updated results
        const updatedResult = await pool.query(`
            SELECT email, first_name, last_name 
            FROM auth.users 
            ORDER BY email
        `);
        
        console.log('\n📋 Updated user names:');
        console.table(updatedResult.rows);

    } catch (error) {
        console.error('❌ Error populating names:', error.message);
    } finally {
        await pool.end();
    }
}

// Helper function to capitalize first letter
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

populateNamesFromEmails();