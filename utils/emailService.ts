import fetch from 'node-fetch';

interface EmailParams {
  to: string;
  subject: string;
  ticketId: string;
  status: string;
}

const getEmailTemplate = (status: string, ticketId: string): string => {
  const templates: Record<string, string> = {
    new: `
      <h2>New Ticket Created</h2>
      <p>A new ticket (ID: ${ticketId}) has been created and requires attention.</p>
      <p>Please review and assign it to an appropriate agent.</p>
    `,
    assigned: `
      <h2>Ticket Assigned</h2>
      <p>Ticket (ID: ${ticketId}) has been assigned to you.</p>
      <p>Please review and begin working on this ticket.</p>
    `,
    escalated: `
      <h2>Ticket Escalated</h2>
      <p>Ticket (ID: ${ticketId}) has been escalated and requires immediate attention.</p>
      <p>Please review the ticket and take necessary action.</p>
    `,
    resolved: `
      <h2>Ticket Resolved</h2>
      <p>Your ticket (ID: ${ticketId}) has been resolved.</p>
      <p>Please review the resolution and let us know if you need any further assistance.</p>
    `,
  };

  return templates[status] || `
    <h2>Ticket Update</h2>
    <p>Ticket (ID: ${ticketId}) has been updated.</p>
    <p>Please review the latest changes.</p>
  `;
};

export async function sendEmailAlert({ to, subject, ticketId, status }: EmailParams) {
  try {
    const htmlContent = getEmailTemplate(status, ticketId);

    const response = await fetch('/api/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        ticketId,
        status,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}
