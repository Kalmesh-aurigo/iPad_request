const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors()); // Allow requests from the kiosk HTML page
app.use(express.json());

// ── Configuration ─────────────────────────────────────────────
// Set these in your .env file (see setup guide)
const ZENDESK_SUBDOMAIN = process.env.ZENDESK_SUBDOMAIN || 'aurigointernalsupport';
const ZENDESK_EMAIL     = process.env.ZENDESK_EMAIL     || 'admin@aurigointernalsupport.com';
const ZENDESK_TOKEN     = process.env.ZENDESK_TOKEN     || 'YOUR_API_TOKEN';
// ─────────────────────────────────────────────────────────────

app.post('/create-ticket', async (req, res) => {
  try {
    const data = req.body;

    // Validate required fields server-side
    if (!data.email || !data.sub_category || !data.assignee_email) {
      return res.status(400).json({ error: 'Missing required fields: email, sub_category, assignee_email' });
    }

    const zendeskPayload = {
      ticket: {
        subject: data.sub_category || data.subject,
        comment: {
          body: [
            `Email:          ${data.email}`,
            `Department:     ${data.department || 'N/A'}`,
            `Location:       ${data.location || 'N/A'}`,
            `Category:       ${data.category || 'N/A'}`,
            `Subject:        ${data.sub_category || 'N/A'}`,
            `Assignee Email: ${data.assignee_email || 'N/A'}`,
            ``,
            `Description:`,
            data.description || '(No description provided)',
          ].join('\n')
        },
        requester: {
          name: data.name,
          email: data.email
        },
        assignee_email: data.assignee_email || undefined,
        tags: data.tags || ['walk-in', 'kiosk'],
        // Custom fields — uncomment and add your Zendesk field IDs here if needed
        // custom_fields: [
        //   { id: 123456, value: data.location },
        //   { id: 789012, value: data.category },
        // ]
      }
    };

    const response = await axios.post(
      `https://aurigointernalsupport.zendesk.com/api/v2/tickets.json`,
      zendeskPayload,
      {
        auth: {
          username: `${ZENDESK_EMAIL}/token`,
          password: ZENDESK_TOKEN
        },
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const ticketId = response.data.ticket.id;
    console.log(`Ticket created: #${ticketId} for ${data.email} — assigned to ${data.assignee_email}`);
    res.json({ ticket_id: ticketId });

  } catch (error) {
    const errMsg = error.response?.data || error.message;
    console.error('Zendesk API error:', errMsg);
    res.status(500).json({ error: 'Failed to create ticket', detail: errMsg });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
