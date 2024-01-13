/**
 * Send a notification to a Discord channel via webhook.
 * 
 * @param {string} message - The message to send.
 * @param {string} webhookUrl - The webhook URL of the Discord channel.
 */
import dotenv from 'dotenv';
dotenv.config();
const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

async function sendDiscordNotification(message) {
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: message }),
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        console.log('Message sent successfully');
    } catch (error) {
        console.error('Failed to send message:', error);
    }
}

// Example usage
export { sendDiscordNotification };

