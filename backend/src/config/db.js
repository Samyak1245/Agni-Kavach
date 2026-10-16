import mongoose, { connect } from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {   // async method returns a promise after its completion
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)  // connection response object returned
        console.log(`\nMongoDB Connected !! DB HOST: ${connectionInstance.connection.host}`) // console.log(connection.instance())
        // console.log("Database:", connectionInstance.connection.name);
        // console.log("Host:", connectionInstance.connection.host);
    } catch (error) {
        console.log("Error: MongoDB connection FAILED!!!", error);
        process.exit(1)
    }
}

export default connectDB; 