import fs from 'fs/promises';
import path from 'path';
import Handlebars from 'handlebars';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-radius: 5px;
        }
        .content {
            padding: 20px;
            background: #ffffff;
            border-radius: 5px;
        }
        .footer {
            text-align: center;
            padding: 20px;
            font-size: 0.8em;
            color: #666;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>{{appName}}</h2>
    </div>
    <div class="content">
        <h3>{{title}}</h3>
        {{{content}}}
    </div>
    <div class="footer">
        <p>© {{year}} {{appName}}. All rights reserved.</p>
        <p>If you didn't request this email, please ignore it.</p>
    </div>
</body>
</html>
`;

export const emailTemplates = {
    welcome: {
        subject: 'Welcome to {{appName}}',
        content: `
            <p>Hi {{firstName}},</p>
            <p>Welcome to {{appName}}! We're excited to have you on board.</p>
            <p>To get started, please verify your email address:</p>
            <p style="text-align: center;">
                <strong>Your verification code is: {{verificationCode}}</strong>
            </p>
            <p>This code will expire in 15 minutes.</p>
            <p>Best regards,<br>The {{appName}} Team</p>
        `
    },
    verification: {
        subject: 'Verify Your Email',
        content: `
            <p>Hi {{firstName}},</p>
            <p>Your verification code is:</p>
            <p style="text-align: center; font-size: 24px; padding: 20px;">
                <strong>{{verificationCode}}</strong>
            </p>
            <p>This code will expire in 15 minutes.</p>
            <p>Best regards,<br>The {{appName}} Team</p>
        `
    }
};

export const renderEmailTemplate = async (templateName, data) => {
    const template = emailTemplates[templateName];
    if (!template) {
        throw new Error(`Email template '${templateName}' not found`);
    }

    // Compile the content template
    const contentTemplate = Handlebars.compile(template.content);
    const renderedContent = contentTemplate({
        ...data,
        appName: process.env.APP_NAME || 'Our App',
        year: new Date().getFullYear()
    });

    // Compile the main template
    const mainTemplate = Handlebars.compile(defaultTemplate);
    const html = mainTemplate({
        ...data,
        appName: process.env.APP_NAME || 'Our App',
        year: new Date().getFullYear(),
        title: template.subject.replace('{{appName}}', process.env.APP_NAME || 'Our App'),
        content: renderedContent
    });

    return {
        subject: Handlebars.compile(template.subject)({
            appName: process.env.APP_NAME || 'Our App'
        }),
        html
    };
}; 