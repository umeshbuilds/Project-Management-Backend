import { User  } from "../models/user.models.js";
import {ApiResponse} from "../utils/api-response.js";
import {ApiError} from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { emailVerificationMailgenContent, sendEmail } from "../utils/mail.js";

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating Token ");

    }
}
const registerUser = asyncHandler(async (req,res) => {
    const {email,username,password,fullName,role} = req.body
    const existedUser = await User.findOne({
        $or: [{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409, "User with email or username already exists",[])
    }
    const user =  await User.create({
        email,
        password,
        username,
        fullName,
        isEmailVerified: false
    })

    const {unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken()
    user.emailVerificationToken = hashedToken
    user.emailVerificationExpiry = tokenExpiry
    await user.save({validateBeforeSave:false})
    await sendEmail(
        {
            email: user?.email,
            subject: "Please verify your email",
            mailgenContent: emailVerificationMailgenContent(
                user.username,`${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}` ,
                ),

        });
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user!")
    }

    return res.status(201).json(
        new ApiResponse(200, { user: createdUser }, "User registered successfully and verification email sent successfully.")
    )
})

const login = asyncHandler( async(req,res)=>{
    const {email,username,password} = req.body
    if(!email){
        throw new ApiError (400,"Email is required")
    }
    const user = await User.findOne({email});
    if(!user){
        throw new ApiError(400,"No user exist!")
    }
    const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(400,"invalid credantials!")
    }
    const{accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)
    
     const loggedUser = await User.findOne(user._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
    )
    const options = {
        httpOnly : true,
        secure : true
    } 
    return res
            .status(200,"success")
            .cookie("accessToken", accessToken,options)
            .cookie("refreshToken", refreshToken,options)
            .json(
                new ApiResponse(
                    200,{
                        user: loggedUser,
                        accessToken,
                        refreshToken
                    },
                    "User logged in succesfully "
                )
            )
    
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { refreshToken: "" } },
        { new: true }
    )
    const options ={
        httpOnly: true,
         secure: true
    }


    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(200, {}, "User logged out successfully.")
    )
})

export{registerUser,login,logoutUser}