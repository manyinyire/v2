import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Configure nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(request: Request) {
  try {
    const { to, subject, ticketId, status } = await request.json();

    // Email template based on status
    const emailContent = getEmailTemplate(status, ticketId);

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html: emailContent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email sending failed:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}

function getEmailTemplate(status: string, ticketId: string) {
  const statusMessages: Record<string, { title: string; message: string }> = {
    new: {
      title: 'New Ticket Created',
      message: 'A new ticket has been created and is awaiting assignment.',
    },
    assigned: {
      title: 'Ticket Assigned',
      message: 'Your ticket has been assigned to an agent and will be processed soon.',
    },
    in_progress: {
      title: 'Ticket In Progress',
      message: 'Work has begun on your ticket.',
    },
    escalated: {
      title: 'Ticket Escalated',
      message: 'Your ticket has been escalated for further review.',
    },
    resolved: {
      title: 'Ticket Resolved',
      message: 'Your ticket has been resolved. Please review the solution.',
    },
    closed: {
      title: 'Ticket Closed',
      message: 'Your ticket has been closed. Thank you for using our service.',
    },
  };

  const { title, message } = statusMessages[status] || {
    title: 'Ticket Update',
    message: 'Your ticket status has been updated.',
  };

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c3e50;">${title}</h2>
      <p style="color: #34495e;">${message}</p>
      <p style="color: #34495e;">Ticket ID: ${ticketId}</p>
      <hr style="border: 1px solid #eee;">
      <p style="color: #7f8c8d; font-size: 0.9em;">
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
  `;
}
