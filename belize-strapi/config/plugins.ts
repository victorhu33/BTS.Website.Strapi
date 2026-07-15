export default ({ env }) => ({
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // STARTTLS (recomendado)
        auth: {
          user: env('GMAIL_USERNAME'),
          pass: env('GMAIL_APP_PASSWORD'),
        },
      },
      settings: {
        defaultFrom: env('EMAIL_DEFAULT_FROM'),
        defaultReplyTo: env('EMAIL_DEFAULT_REPLYTO'),
      },
    },
  },
});

