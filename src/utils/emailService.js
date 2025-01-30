import nodemailer from 'nodemailer';
import { renderEmailTemplate } from '../services/emailTemplateService.js';

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

export const sendTemplatedEmail = async (to, templateName, data) => {
    try {
        const { subject, html } = await renderEmailTemplate(templateName, data);
        
        const mailOptions = {
            from: process.env.SMTP_FROM,
            to,
            subject,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
    }
}; 