import axios from 'axios';
import { logger } from '../utils/logger';

export class NotificationService {
  private slackWebhookUrl: string | null = null;
  private externalWebhookUrl: string | null = null;
  private frontendUrl: string;

  constructor() {
    this.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL !== 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK' 
      ? process.env.SLACK_WEBHOOK_URL || null 
      : null;
    
    this.externalWebhookUrl = process.env.EXTERNAL_WEBHOOK_URL !== 'https://webhook.site/your-unique-id'
      ? process.env.EXTERNAL_WEBHOOK_URL || null
      : null;
    
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  async processInterestedEmail(email: any): Promise<void> {
    try {
      const priorityCategories = ['interested', 'meeting_booked'];
      
      if (!priorityCategories.includes(email.aiCategory)) {
        return;
      }

      logger.info(`📱 Processing ${email.aiCategory} email: ${email.subject}`);

      const notifications = [];

      if (this.slackWebhookUrl) {
        notifications.push(this.sendSlackNotification(email));
      }

      if (this.externalWebhookUrl) {
        notifications.push(this.sendWebhookNotification(email));
      }

      notifications.push(this.logEmailNotification(email));

      await Promise.allSettled(notifications);
      
    } catch (error) {
      logger.error('Failed to process email notification:', error);
    }
  }

  private async sendSlackNotification(email: any): Promise<void> {
    if (!this.slackWebhookUrl) return;

    try {
      const icon = email.aiCategory === 'meeting_booked' ? '📅' : '🎯';
      const title = email.aiCategory === 'meeting_booked' ? 'Meeting Booked!' : 'New Interested Lead!';

      const payload: any = {
        text: `${icon} ${title}`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `${icon} ${title}`
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*From:* ${email.from.name || email.from.address}`
              },
              {
                type: "mrkdwn",
                text: `*Email:* ${email.from.address}`
              },
              {
                type: "mrkdwn",
                text: `*Subject:* ${email.subject}`
              },
              {
                type: "mrkdwn",
                text: `*AI Confidence:* ${Math.round((email.aiConfidence || 0) * 100)}%`
              }
            ]
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Message Preview:*\n${email.textBody.substring(0, 200)}${email.textBody.length > 200 ? '...' : ''}`
            }
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "View Email"
                },
                url: `${this.frontendUrl}/emails/${email._id}`,
                style: "primary"
              },
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Reply"
                },
                url: `${this.frontendUrl}/emails/${email._id}/reply`
              }
            ]
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `📅 Received: ${new Date(email.receivedDate).toLocaleString()}`
              }
            ]
          }
        ]
      };

      await axios.post(this.slackWebhookUrl!, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });

      logger.info('✅ Slack notification sent successfully');
    } catch (error) {
      logger.error('Failed to send Slack notification:', error);
    }
  }

  private async sendWebhookNotification(email: any): Promise<void> {
    if (!this.externalWebhookUrl) return;

    try {
      const payload = {
        event: 'priority_email',
        timestamp: new Date().toISOString(),
        data: {
          emailId: email._id,
          messageId: email.messageId,
          from: {
            address: email.from.address,
            name: email.from.name
          },
          to: email.to,
          subject: email.subject,
          body: email.textBody,
          receivedDate: email.receivedDate,
          aiCategory: email.aiCategory,
          aiConfidence: email.aiConfidence,
          folder: email.folder,
          isRead: email.isRead
        },
        links: {
          view: `${this.frontendUrl}/emails/${email._id}`,
          reply: `${this.frontendUrl}/emails/${email._id}/reply`
        }
      };

      await axios.post(this.externalWebhookUrl!, payload, {
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'ReachInbox/1.0'
        },
        timeout: 5000
      });

      logger.info('✅ External webhook notification sent successfully');
    } catch (error) {
      logger.error('Failed to send webhook notification:', error);
    }
  }

  private async logEmailNotification(email: any): Promise<void> {
    const logData = {
      timestamp: new Date().toISOString(),
      event: 'priority_email_received',
      category: email.aiCategory,
      from: email.from.address,
      subject: email.subject,
      confidence: email.aiConfidence,
      receivedDate: email.receivedDate
    };

    logger.info('📧 Priority Email Alert:', logData);
  }

  async sendBulkNotification(emails: any[]): Promise<void> {
    if (emails.length === 0) return;

    try {
      const priorityEmails = emails.filter(email => 
        ['interested', 'meeting_booked'].includes(email.aiCategory)
      );
      
      if (priorityEmails.length === 0) return;

      if (this.slackWebhookUrl) {
        await this.sendBulkSlackNotification(priorityEmails);
      }

      logger.info(`📊 Processed ${priorityEmails.length} priority emails in bulk`);
    } catch (error) {
      logger.error('Failed to send bulk notification:', error);
    }
  }

  private async sendBulkSlackNotification(emails: any[]): Promise<void> {
    if (!this.slackWebhookUrl) return;

    try {
      const payload = {
        text: `🎯 ${emails.length} New Priority Leads!`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `🎯 ${emails.length} New Priority Leads!`
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Recent priority leads:*"
            }
          },
          ...emails.slice(0, 5).map((email, index) => ({
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*${index + 1}. ${email.from.name || email.from.address}*`
              },
              {
                type: "mrkdwn",
                text: `${email.subject} (${email.aiCategory})`
              }
            ]
          }))
        ]
      };

      if (emails.length > 5) {
        (payload.blocks as any).push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `_...and ${emails.length - 5} more_`
          }
        });
      }

      (payload.blocks as any).push({
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View All Emails"
            },
            url: `${this.frontendUrl}/emails?filter=priority`,
            style: "primary"
          }
        ]
      });

      await axios.post(this.slackWebhookUrl!, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });

      logger.info('✅ Bulk Slack notification sent successfully');
    } catch (error) {
      logger.error('Failed to send bulk Slack notification:', error);
    }
  }

  async testNotifications(): Promise<{ slack: boolean; webhook: boolean }> {
    const results = { slack: false, webhook: false };

    if (this.slackWebhookUrl) {
      try {
        await axios.post(this.slackWebhookUrl, {
          text: "🧪 ReachInbox Test Notification - Slack integration working!"
        }, { timeout: 5000 });
        results.slack = true;
        logger.info('✅ Slack test notification sent');
      } catch (error) {
        logger.error('❌ Slack test notification failed:', error);
      }
    }

    if (this.externalWebhookUrl) {
      try {
        await axios.post(this.externalWebhookUrl, {
          event: 'test_notification',
          timestamp: new Date().toISOString(),
          message: 'ReachInbox webhook integration test'
        }, { timeout: 5000 });
        results.webhook = true;
        logger.info('✅ Webhook test notification sent');
      } catch (error) {
        logger.error('❌ Webhook test notification failed:', error);
      }
    }

    return results;
  }

  getConfiguration(): any {
    return {
      slack: {
        configured: !!this.slackWebhookUrl,
        url: this.slackWebhookUrl ? '***configured***' : null
      },
      webhook: {
        configured: !!this.externalWebhookUrl,
        url: this.externalWebhookUrl ? '***configured***' : null
      },
      frontend: {
        url: this.frontendUrl
      }
    };
  }
}
