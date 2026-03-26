import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(name: string, email: string, subject: string, message: string) {
  return resend.emails.send({
    from: `Albert Jordaan <${process.env.EMAIL_TO}>`,
    to: process.env.EMAIL_TO as string, // email I am sending to (aka me)
    replyTo: email, // the other user email
    subject: `Portfolio: ${subject}`,
    text: message,
    html: `<h2>From: ${name}</h2>
           <p>Email: ${email}</p>
           <p>Subject: ${subject}</p>
           <p>Message: ${message}</p>`,
  });
}