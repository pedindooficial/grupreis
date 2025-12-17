/**
 * Script to create a test location capture token
 * This creates the specific token mentioned by the user
 */

import "dotenv/config";
import { connectDB } from "../src/db";
import LocationCaptureModel from "../src/models/LocationCapture";

const TEST_TOKEN = "8540f1dcca6c0fcdca8dce4b54d1f14e52d3d909c2fd9b93e44c5a4f37144db4";

async function createTestToken() {
  try {
    await connectDB();
    console.log("Connected to MongoDB");

    // Check if token already exists
    const existing = await LocationCaptureModel.findOne({ token: TEST_TOKEN });
    
    if (existing) {
      console.log("✅ Test token already exists!");
      console.log("Status:", existing.status);
      console.log("Description:", existing.description);
      console.log("Expires at:", existing.expiresAt);
      
      if (existing.status === "captured") {
        console.log("\n📍 Location captured:");
        console.log("Latitude:", existing.latitude);
        console.log("Longitude:", existing.longitude);
        console.log("Address:", existing.address);
        console.log("Captured at:", existing.capturedAt);
      }
      
      return;
    }

    // Create test token
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    const locationCapture = await LocationCaptureModel.create({
      token: TEST_TOKEN,
      description: "Token de teste para captura de localização",
      resourceType: "other",
      status: "pending",
      expiresAt
    });

    console.log("✅ Test token created successfully!");
    console.log("\n📋 Token Details:");
    console.log("Token:", locationCapture.token);
    console.log("URL:", `http://localhost:3000/location-capture/${locationCapture.token}`);
    console.log("Status:", locationCapture.status);
    console.log("Expires at:", locationCapture.expiresAt);
    console.log("\n🎯 Access the page to test location capture!");
    
  } catch (error) {
    console.error("❌ Error creating test token:", error);
    throw error;
  } finally {
    process.exit();
  }
}

createTestToken();

