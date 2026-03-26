import nodemailer from 'nodemailer'

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
});

export async function sendEmail(name:string, email:string, subject: string, message: string) {
    const result = await transporter.sendMail({
        from: `${process.env.SMTP_USER}`, // sender address
        to: process.env.SMTP_USER, // to me
        replyTo: email, // reply to the user
        subject: `Portfolio Site: ${subject}`, // Subject line
        text: message, // plain text body
        html: `<h2>from: ${name}</h2><br>
               <p>user email: ${email}</p><br>
               <p>subject: ${subject}</p><br>
               <p>message: ${message}</p>`, // html body
    });
}
