import {body} from  "express-validator";

const userRegisterdValidator = () => {
 return[
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Email is invalid"),
    body("username")
         .trim()
         .notEmpty()
         .withMessage("Username is required")
         .isLowercase()
         .withMessage("Username must be in lowercase")
         .isLength({min:3})
         .withMessage("Username must be at atelast in 3 characters long"),
    body("password")
         .trim()
         .notEmpty()
         .withMessage("Password Required"),
    body("fullName")
         .trim()
         .notEmpty()
         .withMessage("full name required")

 ]
}

const userLoginValidator = () =>{
     return [
          body("email")
          .optional()
          .isEmail()
          .withMessage("Email is invalid"),
         body("password")
          .notEmpty()
          .withMessage("Please enter password")
          
     ]
}

export{userLoginValidator,userRegisterdValidator}