import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { pool } from '../../src/db/index';
import { realtimeHub } from '../realtime/hub';

export interface NotificationParams {
  userId?: number | null;
  facilityId?: number | null;
  type:
    | 'ALERT'
    | 'SCHEDULE_UPDATE'
    | 'LEAVE_STATUS'
    | 'BACKUP_ASSIGNMENT'
    | 'SYSTEM';
  channel?: 'IN_APP' | 'EMAIL' | 'SMS';
  title: string;
  message: string;
}

type NotificationStatus =
  | 'DELIVERED'
  | 'NOT_CONFIGURED'
  | 'QUEUED'
  | 'ACCEPTED'
  | 'FAILED';

interface ProviderResult {
  status: NotificationStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
}

function createGmailTransport() {
  const user = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD;

  if (!user || !appPassword) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass: appPassword,
    },
  });
}

function createTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return null;
  }

  return twilio(accountSid, authToken);
}

async function getRecipient(userId?: number | null) {
  if (!userId) {
    return null;
  }

  const result = await pool.query(
    `
      SELECT id, name, email, phone
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
  );

  return result.rows[0] ?? null;
}

async function sendEmail(
  recipient: { email?: string | null; name?: string | null },
  title: string,
  message: string,
): Promise<ProviderResult> {
  const transport = createGmailTransport();

  if (!transport) {
    return {
      status: 'NOT_CONFIGURED',
      errorMessage:
        'Gmail is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.',
    };
  }

  if (!recipient.email) {
    return {
      status: 'FAILED',
      errorMessage: 'The notification recipient has no email address.',
    };
  }

  try {
    const fromAddress =
      process.env.EMAIL_FROM_ADDRESS || process.env.GMAIL_USER;

    const fromName =
      process.env.EMAIL_FROM_NAME || 'CAREGRID Operations';

    const result = await transport.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: recipient.email,
      subject: title,
      text: message,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(message).replace(/\n/g, '<br />')}</p>
          <hr />
          <p style="font-size:12px;color:#666">
            CAREGRID Healthcare Operations & Intelligence Platform
          </p>
        </div>
      `,
    });

    return {
      status: 'ACCEPTED',
      providerMessageId: result.messageId,
    };
  } catch (error) {
    return {
      status: 'FAILED',
      errorMessage: getErrorMessage(error),
    };
  }
}

async function sendSms(
  recipient: { phone?: string | null },
  message: string,
): Promise<ProviderResult> {
  const client = createTwilioClient();
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!client || !fromNumber) {
    return {
      status: 'NOT_CONFIGURED',
      errorMessage:
        'Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER.',
    };
  }

  if (!recipient.phone) {
    return {
      status: 'FAILED',
      errorMessage: 'The notification recipient has no phone number.',
    };
  }

  try {
    const callbackUrl = process.env.TWILIO_STATUS_CALLBACK_URL;

    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: recipient.phone,
      ...(callbackUrl
        ? {
            statusCallback: callbackUrl,
            statusCallbackMethod: 'POST' as const,
          }
        : {}),
    });

    return {
      status: 'ACCEPTED',
      providerMessageId: result.sid,
    };
  } catch (error) {
    return {
      status: 'FAILED',
      errorMessage: getErrorMessage(error),
    };
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function sendNotification(params: NotificationParams) {
  const channel = params.channel || 'IN_APP';

  let status: NotificationStatus = 'DELIVERED';
  let providerMessageId: string | null = null;
  let errorMessage: string | null = null;

  const recipient = await getRecipient(params.userId);

  if (channel === 'EMAIL') {
    if (!recipient) {
      status = 'FAILED';
      errorMessage = 'Notification recipient was not found.';
    } else {
      const result = await sendEmail(
        recipient,
        params.title,
        params.message,
      );

      status = result.status;
      providerMessageId = result.providerMessageId ?? null;
      errorMessage = result.errorMessage ?? null;
    }
  }

  if (channel === 'SMS') {
    if (!recipient) {
      status = 'FAILED';
      errorMessage = 'Notification recipient was not found.';
    } else {
      const result = await sendSms(
        recipient,
        params.message,
      );

      status = result.status;
      providerMessageId = result.providerMessageId ?? null;
      errorMessage = result.errorMessage ?? null;
    }
  }

  const deliveredAt =
    status === 'DELIVERED'
      ? 'NOW()'
      : 'NULL';

  const result = await pool.query(
    `
      INSERT INTO notifications (
        user_id,
        facility_id,
        type,
        channel,
        title,
        message,
        status,
        provider_message_id,
        error_message,
        sent_at,
        delivered_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        NOW(),
        ${deliveredAt}
      )
      RETURNING *;
    `,
    [
      params.userId ?? null,
      params.facilityId ?? null,
      params.type,
      channel,
      params.title,
      params.message,
      status,
      providerMessageId,
      errorMessage,
    ],
  );

  const notification = result.rows[0];

  realtimeHub.broadcast(
    'notification.created',
    notification,
  );

  return notification;
}