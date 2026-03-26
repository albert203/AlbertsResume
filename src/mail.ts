import nodemailer, { TransportOptions } from 'nodemailer'

// https://nodemailer.com/

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // use STARTTLS (upgrade connection to TLS after connecting)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  family: 4,
} as any);

export async function sendEmail(name:string, email:string, subject: string, message: string) {
    try {
        const result = await transporter.sendMail({
            from: `"Albert Jordaan" <${process.env.SMTP_USER}>`, // ✅ Added name format
            to: process.env.SMTP_USER,
            replyTo: email,
            subject: `Portfolio Site: ${subject}`,
            text: message,
            html: `<h2>from: ${name}</h2><br>
                   <p>user email: ${email}</p><br>
                   <p>subject: ${subject}</p><br>
                   <p>message: ${message}</p>`,
        });
        console.log('Email sent correctly:', result.messageId);
        return result;
    } catch (err: any) {
        console.error('error sending email:', {
            message: err.message,
            code: err.code,
            command: err.command,
            response: err.response,
        });
        throw err; 
    }
}
