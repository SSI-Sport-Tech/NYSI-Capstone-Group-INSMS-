#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './Backend/.env' });

const { Pool } = pg;

// Create database connection
const pool = new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false,
});

const SESSION_ID = '019c81ea-062b-7a88-b848-c5a41cc1874d';

const consultationData = {
    main_nutrition_diagnosis: 'Inadequate carbohydrate intake for training load, insufficient protein post-exercise recovery, and suboptimal hydration during training sessions as evidenced by 24-hour dietary recall showing 3.2g/kg carbohydrates, 1.1g/kg protein, and reported fatigue during afternoon training.',
    carbohydrates_review_id: '019c4c05-c20e-76bf-84b9-38a6491d6f99', // Insufficient intake of carbohydrates
    protein_review_id: '019c4c05-c213-7f19-b9ae-efec2c5b5a5e',       // Insufficient intake of protein  
    fat_review_id: '019c4c05-c215-76a5-8731-e7f9dd22804d',           // Adequate intake of fat
    fibre_review_id: '019c4c05-c215-735a-bc36-5f04b4ade82b',         // Adequate intake of fibre
    iron_review_id: '019c4c05-c216-7e84-ae47-5f4acf0de8ab',          // Adequate intake of high-iron food items
    calcium_review_id: '019c4c05-c216-76f9-b01d-ed11cdb445d4',       // Inconsistent intake of calcium-rich foods
    micronutrients_review_id: '019c4c05-c216-7143-8f34-75efa82f1e04', // Adequate intake of micronutrients
    other_review: 'Supplement Intake - Athlete currently taking whey protein post-workout and multivitamin daily',
    follow_up_note: 'Monitor carbohydrate intake around training sessions. Recommend 1.5g/kg carbs 2-3 hours pre-training and 1g/kg within 30 minutes post-training. Schedule follow-up in 2 weeks to assess energy levels and training performance.',
    intervention_note: 'Prescribed increased carbohydrate intake targeting 5-7g/kg body weight daily. Recommended high-quality protein sources post-workout (25-30g). Advised on improved hydration strategy with electrolyte replacement during sessions >60 minutes.',
    other_remarks: 'Athlete is highly motivated and receptive to dietary changes. Has good understanding of sports nutrition principles. Previously responded well to structured meal planning.'
};

async function populateConsultationDetails() {
    const client = await pool.connect();
    try {
        console.log(`Connecting to database...`);
        
        // Check if session_note record exists
        const checkResult = await client.query(
            'SELECT id, sessions_id FROM consultation.session_note WHERE sessions_id = $1',
            [SESSION_ID]
        );
        
        console.log(`Session note exists: ${checkResult.rows.length > 0 ? 'Yes' : 'No'}`);
        
        if (checkResult.rows.length === 0) {
            console.log('❌ No session_note record found for this session ID');
            console.log('Creating a new session_note record...');
            
            // Insert new session_note record
            const insertResult = await client.query(`
                INSERT INTO consultation.session_note (
                    sessions_id, main_nutrition_diagnosis, carbohydrates_review_id,
                    protein_review_id, fat_review_id, fibre_review_id,
                    iron_review_id, calcium_review_id, micronutrients_review_id,
                    other_review, follow_up_note, intervention_note, other_remarks
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING id, sessions_id
            `, [
                SESSION_ID,
                consultationData.main_nutrition_diagnosis,
                consultationData.carbohydrates_review_id,
                consultationData.protein_review_id,
                consultationData.fat_review_id,
                consultationData.fibre_review_id,
                consultationData.iron_review_id,
                consultationData.calcium_review_id,
                consultationData.micronutrients_review_id,
                consultationData.other_review,
                consultationData.follow_up_note,
                consultationData.intervention_note,
                consultationData.other_remarks
            ]);
            
            console.log('✅ Created new session_note record:', insertResult.rows[0]);
        } else {
            console.log('Updating existing session_note record...');
            
            // Update existing session_note record
            const updateResult = await client.query(`
                UPDATE consultation.session_note 
                SET 
                    main_nutrition_diagnosis = $2,
                    carbohydrates_review_id = $3,
                    protein_review_id = $4,
                    fat_review_id = $5,
                    fibre_review_id = $6,
                    iron_review_id = $7,
                    calcium_review_id = $8,
                    micronutrients_review_id = $9,
                    other_review = $10,
                    follow_up_note = $11,
                    intervention_note = $12,
                    other_remarks = $13
                WHERE sessions_id = $1
                RETURNING id, sessions_id
            `, [
                SESSION_ID,
                consultationData.main_nutrition_diagnosis,
                consultationData.carbohydrates_review_id,
                consultationData.protein_review_id,
                consultationData.fat_review_id,
                consultationData.fibre_review_id,
                consultationData.iron_review_id,
                consultationData.calcium_review_id,
                consultationData.micronutrients_review_id,
                consultationData.other_review,
                consultationData.follow_up_note,
                consultationData.intervention_note,
                consultationData.other_remarks
            ]);
            
            console.log('✅ Updated session_note record:', updateResult.rows[0]);
        }
        
        // Verify the data was populated
        const verifyResult = await client.query(`
            SELECT 
                sn.main_nutrition_diagnosis,
                c_diag.diagnosis as carb_diagnosis,
                p_diag.diagnosis as protein_diagnosis,
                f_diag.diagnosis as fat_diagnosis,
                sn.other_review,
                sn.follow_up_note,
                sn.intervention_note,
                sn.other_remarks
            FROM consultation.session_note sn
            LEFT JOIN consultation.nutrition_diagnosis_lookup c_diag ON sn.carbohydrates_review_id = c_diag.id
            LEFT JOIN consultation.nutrition_diagnosis_lookup p_diag ON sn.protein_review_id = p_diag.id  
            LEFT JOIN consultation.nutrition_diagnosis_lookup f_diag ON sn.fat_review_id = f_diag.id
            WHERE sn.sessions_id = $1
        `, [SESSION_ID]);
        
        if (verifyResult.rows.length > 0) {
            console.log('\n✅ Successfully populated consultation details!');
            console.log('\n📋 Data verification:');
            const data = verifyResult.rows[0];
            console.log('Main Diagnosis:', data.main_nutrition_diagnosis?.substring(0, 100) + '...');
            console.log('Carb Review:', data.carb_diagnosis);
            console.log('Protein Review:', data.protein_diagnosis);
            console.log('Fat Review:', data.fat_diagnosis);
            console.log('Other Review:', data.other_review);
            console.log('Follow-up Note:', data.follow_up_note?.substring(0, 80) + '...');
            console.log('Intervention Note:', data.intervention_note?.substring(0, 80) + '...');
            console.log('Other Remarks:', data.other_remarks?.substring(0, 80) + '...');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the script
populateConsultationDetails();