// scripts/view-existing-data.js
// Run with: node scripts/view-existing-data.js

import pool from '../config/db.js';

async function viewExistingData() {
    try {
        console.log('🔍 Checking existing database data...\n');

        // 1. Check Supplement Status Lookup
        console.log('📋 Supplement_Status_Lookup:');
        const statusResult = await pool.query(`
      SELECT id, supplement_status, is_active 
      FROM SSS.Supplement_Status_Lookup 
      ORDER BY supplement_status
    `);

        if (statusResult.rows.length > 0) {
            console.table(statusResult.rows);
            console.log('💡 Copy these UUIDs for your frontend dropdown!\n');
        } else {
            console.log('   ⚠️  No data found. You may need to seed this table.\n');
        }

        // 2. Check Packaging Form Lookup
        console.log('📋 Supplement_Packaging_Form_Lookup:');
        const formResult = await pool.query(`
      SELECT id, supplement_packaging_form, is_active 
      FROM SSS.Supplement_Packaging_Form_Lookup 
      ORDER BY supplement_packaging_form
    `);

        if (formResult.rows.length > 0) {
            console.table(formResult.rows);
        } else {
            console.log('   ⚠️  No data found.\n');
        }

        // 3. Check if Supplement table has any data
        console.log('📋 Supplement Table:');
        const supplementCount = await pool.query(`
      SELECT COUNT(*) as count FROM SSS.Supplement
    `);
        console.log(`   Total supplements: ${supplementCount.rows[0].count}\n`);

        // 4. Show sample supplement if any exist
        if (parseInt(supplementCount.rows[0].count) > 0) {
            console.log('📋 Sample Supplement (showing structure):');
            const sample = await pool.query(`
        SELECT * FROM SSS.Supplement LIMIT 1
      `);
            console.log(sample.rows[0]);
            console.log('\n');
        }

        console.log('✅ Database check complete!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

viewExistingData();