import dotenv from "dotenv"
import app from "./app.js"
import connectDB from "./db/dbConnection.js";
import { connect } from "mongoose";

dotenv.config({
    path:"./.env",
})


const port = parseInt(process.env.PORT, 10) || 3000;
connectDB()
.then(()=>{

app.listen( port,()=>{
    console.log(`Example app listening on port http://localhost:${port}`);
})
})
.catch((err)=>{
    console.error("MongoDB connection error");
    process.exit(1)
})



