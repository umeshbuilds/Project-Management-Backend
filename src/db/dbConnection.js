import mongoose from "mongoose"

const connectDB = async()=>{
    try {
       await mongoose.connect(process.env.MONGO_URL)
       console.log("mongoDB connection successful");
       
    } catch (error) {
        console.log("MongDB connection Error",error)
        process.exit(1)
    }
}
export default connectDB