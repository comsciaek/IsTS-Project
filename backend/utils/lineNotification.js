import axios from 'axios';

const CHANNEL_ACCESS_TOKEN = process.env.CHANNEL_ACCESS_TOKEN;

export const sendMessage = async (lineUserId, message) => {
  try {
    const payload = {
      to: lineUserId,
      messages: [{ type: 'text', text: message }],
    };

    const response = await axios.post(
      'https://api.line.me/v2/bot/message/push',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
        },
      }
    );
    console.log('Message sent successfully to:', lineUserId);
    return response;
  } catch (error) {
    console.error('Error sending message to', lineUserId, ':', error.response?.data || error.message);
    throw error;
  }
};