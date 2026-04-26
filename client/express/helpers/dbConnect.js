import "dotenv/config";
import mongoose from "mongoose";

let isConnected = false;

const dbConnect = async () => {
  if (isConnected) {
    console.log("DB Already connected");
    return;
  }
  try {
    const uri = process.env.MONGO_URI;
    const conn = await mongoose.connect(uri);
    isConnected = true;
    console.log("DB Connected Successfully");
  } catch (error) {
    console.error("DB connection failed:", error.message);
    process.exit(1);
  }
};


export default dbConnect;
