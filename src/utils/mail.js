import Mailgen from "mailgen";
import nodemailer from "nodemailer"

const sendEmail = async (options) => {
     const mailGenerator = new Mailgen({
        theme:"default",
        product: {
            name: "Task Manager",
            link: "https://taskmanagerlink.com"
        }
     })
     const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent)
     const emailHtml = mailGenerator.generate(options.mailgenContent)

     const transporter = nodemailer.createTransport({
        host: process.env.MAILTRAP_SMTP_HOST,
        port: process.env.MAILTRAP_SMTP_PORT,
        auth: {
            user : process.env.MAILTRAP_SMTP_USER,
            pass : process.env.MAILTRAP_SMTP_PASS
        }
     })

     const mail = {
        from: "mail.taskmanager@example.com",
        to: options.email,
        subject: options.subject,
        text: emailTextual,
        html: emailHtml
     }
     
     try{
        await transporter.sendMail(mail)
     }catch(error){
        console.error("Email service failed silently. Make sure that you have provided your MAILTRAP credentials in the .env file");
        console.error("Error",error);
        
     }
}

const emailVerificationMailgenContent = (username,verificationUrl) =>{
    return { 
        body:{
            name: username,
            intro : "welcome to our app, we r excited to have u onboard ",
            action:{
                instructions: "To verify your email plz click on the following button",
                button: {
                    color: "#cd4141",
                    text: "verify your email",
                    link: verificationUrl
                },
            },
            outro:"need help or have questions jst reply to this email, we would love to help you all."
        }
    }
};


const forgotPasswordMailgenContent = (username,passwordResetUrl) =>{
    return {
        body:{
            name: username,
            intro : "we got request to reset the password of your account",
            action:{
                instructions: "To reset your password plz click on the following button",
                button: {
                    color: "#a46342",
                    text: "Reset password",
                    link: passwordResetUrl
                },
            },
            outro:"need help or have questions jst reply to this email, we would love to help you all."
        }
    }
};

export{emailVerificationMailgenContent,forgotPasswordMailgenContent,sendEmail};