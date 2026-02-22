#!/usr/bin/env node

const API_BASE_URL = "http://localhost:8000";
const SESSION_ID = "019c81ea-062b-7a88-b848-c5a41cc1874d";

// Training schedule payload in the API format
const trainingSchedulePayload = {
  days: {
    monday: {
      am: "S&C (Max Training) 09:00-10:30",
      pm: "BJJ (Hard Sparring) 15:00-17:00\nTraining with Coach 14:00-15:00",
      trainingHours: 3.5,
      rpe: 7,
    },
    tuesday: {
      am: "S&C (Power) 09:00-10:30",
      pm: "BJJ (No-Gi) 19:30-21:00",
      trainingHours: 2.5,
      rpe: 8,
    },
    wednesday: {
      am: "S&C (Strength) 09:00-10:30",
      pm: "Drilling (Gi) 13:00-14:30",
      trainingHours: 3.0,
      rpe: 6,
    },
    thursday: {
      am: "Yoga/Mobility 09:00-11:00",
      pm: "Comp Class (Gi) 19:00-21:00",
      trainingHours: 3.5,
      rpe: 8,
    },
    friday: {
      am: null,
      pm: "Positional Sparring 14:00-15:00",
      trainingHours: 3.0,
      rpe: 5,
    },
    saturday: {
      am: null,
      pm: null,
      trainingHours: 0,
      rpe: 0,
    },
    sunday: {
      am: null,
      pm: null,
      trainingHours: 0,
      rpe: 0,
    },
  },
  trainingDetails: {
    upcomingMajorCompetitions: "SEA Games 2025 (Thailand)",
    upcomingLocalCompetitions: "Singapore BJJ Open 2024 (December)",
  },
  performanceDetails: {
    currentPerformance:
      "Athlete has shown consistent improvement in competition performance over the past 6 months. Currently ranked top 3 in national Brazilian Jiu-Jitsu competitions. Main strengths include technical proficiency and tactical awareness during matches.",
    coachPerformanceGoals:
      "Focus on improving explosive power and strength for takedown defense. Enhance endurance capacity for longer competition matches. Work on mental preparation and competition mindset for international events.",
    athletePerformanceGoals:
      "Achieve podium finish at SEA Games 2025. Improve submission defense against international competitors. Increase training consistency and reduce injury risk through better recovery protocols.",
    otherRemarks:
      "Athlete demonstrates excellent work ethic and coachability. Shows strong leadership qualities within the team environment. May benefit from sport psychology support for high-pressure competition situations.",
  },
  pal: 1.9,
};

async function populateTrainingScheduleViaAPI() {
  try {
    console.log("Populating training schedule via API...");

    const response = await fetch(
      `${API_BASE_URL}/api/Consultation/sessions/${SESSION_ID}/training-schedule`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(trainingSchedulePayload),
      },
    );

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Successfully populated training schedule!");
      console.log("📋 API Response:", JSON.stringify(result, null, 2));

      console.log("\n🎯 Training Summary:");
      console.log(
        "Total Training Hours:",
        result.data?.totalTrainingHours || "N/A",
      );
      console.log("Physical Activity Level:", result.data?.pal || "N/A");
      console.log(
        "Major Competitions:",
        result.data?.trainingDetails?.upcomingMajorCompetitions || "N/A",
      );
      console.log(
        "Local Competitions:",
        result.data?.trainingDetails?.upcomingLocalCompetitions || "N/A",
      );
    } else {
      const error = await response.json();
      console.error("❌ Failed to populate training schedule:");
      console.error("Status:", response.status);
      console.error("Error:", JSON.stringify(error, null, 2));
    }
  } catch (error) {
    console.error("❌ Network error:", error.message);
  }
}

// Run the script
populateTrainingScheduleViaAPI();
