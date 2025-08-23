require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://saudibuildpro.com']
}));
app.use(bodyParser.json());
app.use(limiter);

// Hostinger SMTP configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
  port: process.env.EMAIL_PORT || 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Test email transport
transporter.verify((error) => {
  if (error) {
    console.error('Error with email transporter:', error);
  } else {
    console.log('Server is ready to send emails');
  }
});

// Contact endpoint with validation
app.post('/api/send', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('message').trim().notEmpty().withMessage('Message is required')
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { name, email, subject, message } = req.body;

    // Email options
    const mailOptions = {
      from: `"SaudibuildPro Contact" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_RECEIVER,
      replyTo: email,
      subject: `New Contact: ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0369a1;">New Contact Form Submission</h2>
          <p><strong style="color: #0369a1;">Name:</strong> ${name}</p>
          <p><strong style="color: #0369a1;">Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong style="color: #0369a1;">Subject:</strong> ${subject}</p>
          <p><strong style="color: #0369a1;">Message:</strong></p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin-top: 10px;">
            ${message.replace(/\n/g, '<br>')}
          </div>
        </div>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);
    
    res.status(200).json({ message: 'Message sent successfully!' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});