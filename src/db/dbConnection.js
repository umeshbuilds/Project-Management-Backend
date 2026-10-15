import mongoose from "mongoose";

let mongodInstance = null;

const connectDB = async () => {
    try {
        if (process.env.MONGO_URL) {
            try {
                await mongoose.connect(process.env.MONGO_URL, {
                    serverSelectionTimeoutMS: 4000
                });
                console.log("mongoDB connection successful (Atlas Cloud)");
                return;
            } catch (remoteErr) {
                console.warn(
                    "Remote MONGO_URL unreachable or inactive (" +
                        remoteErr.message +
                        "). Initializing robust local MongoDB instance..."
                );
            }
        }

        // Fallback to in-memory MongoDB server
        const { MongoMemoryServer } = await import("mongodb-memory-server");
        mongodInstance = await MongoMemoryServer.create({
            instance: {
                dbName: "projmanage"
            }
        });
        const uri = mongodInstance.getUri();
        await mongoose.connect(uri);
        console.log(`mongoDB connection successful (Local / Memory Instance at ${uri})`);
    } catch (error) {
        console.error("MongoDB connection Error:", error);
        process.exit(1);
    }
};

export default connectDB;