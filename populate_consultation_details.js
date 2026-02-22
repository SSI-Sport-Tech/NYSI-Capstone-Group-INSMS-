#!/usr/bin/env node

/**
 * Script to populate consultation details for a specific session
 * Session ID: 019c81ea-062b-7a88-b848-c5a41cc1874d
 */

const API_BASE_URL = "http://localhost:8000";
const SESSION_ID = "019c81ea-062b-7a88-b848-c5a41cc1874d";

// Sample consultation details data
const consultationDetailsData = {
  main_nutrition_diagnosis: "Inadequate carbohydrate intake for training load, insufficient protein post-exercise recovery, and suboptimal hydration during training sessions as evidenced by 24-hour dietary recall showing 3.2g/kg carbohydrates, 1.1g/kg protein, and reported fatigue during afternoon training.",
  
  // Review IDs from the nutrition diagnoses lookup
  carbohydrates_review_id: "019c4c05-c20e-76bf-84b9-38a6491d6f99", // Insufficient intake of carbohydrates
  protein_review_id: "019c4c05-c213-7f19-b9ae-efec2c5b5a5e", // Insufficient intake of protein
  fat_review_id: "019c4c05-c215-76a5-8731-e7f9dd22804d", // Adequate intake of fat
  fibre_review_id: "019c4c05-c215-735a-bc36-5f04b4ade82b", // Adequate intake of fibre
  iron_review_id: "019c4c05-c216-7e84-ae47-5f4acf0de8ab", // Adequate intake of high-iron food items
  calcium_review_id: "019c4c05-c216-76f9-b01d-ed11cdb445d4", // Inconsistent intake of calcium-rich foods
  micronutrients_review_id: "019c4c05-c216-7143-8f34-75efa82f1e04", // Adequate intake of micronutrients evident by consumption of fruits and vegetables
  
  // Free text fields
  other_review: "Supplement Intake - Athlete currently taking whey protein post-workout and multivitamin daily",
  
  follow_up_note: "Monitor carbohydrate intake around training sessions. Recommend 1.5g/kg carbs 2-3 hours pre-training and 1g/kg within 30 minutes post-training. Schedule follow-up in 2 weeks to assess energy levels and training performance.",
  
  intervention_note: "Prescribed increased carbohydrate intake targeting 5-7g/kg body weight daily. Recommended high-quality protein sources post-workout (25-30g). Advised on improved hydration strategy with electrolyte replacement during sessions >60 minutes.",
  
  other_remarks: "Athlete is highly motivated and receptive to dietary changes. Has good understanding of sports nutrition principles. Previously responded well to structured meal planning."
};

async function populateConsultationDetails() {
  try {
    console.log(`Populating consultation details for session: ${SESSION_ID}`);
    
    // Make PATCH request to update consultation details
    const response = await fetch(`${API_BASE_URL}/api/Consultation/consultation-details/${SESSION_ID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        // Note: In a real scenario, you'd need a valid auth token
        // 'Authorization': 'Bearer YOUR_TOKEN_HERE'
      },
      body: JSON.stringify(consultationDetailsData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Successfully updated consultation details!');
      console.log('Response:', JSON.stringify(result, null, 2));
    } else {
      const error = await response.json();
      console.error('❌ Failed to update consultation details:');
      console.error('Status:', response.status);
      console.error('Error:', JSON.stringify(error, null, 2));
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

// Run the script
populateConsultationDetails();