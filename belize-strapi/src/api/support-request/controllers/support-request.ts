export default {
  async submit(ctx) {
    const body = ctx.request.body ?? {};
    const form = body.form ?? body.data ?? body;
    const name =
      form.name ??
      [form.firstName, form.lastName].filter(Boolean).join(" ").trim();
    const email = form.email ?? body.replyTo;
    const phone = form.phone ?? body.phone;
    const subject = form.subject ?? body.subject;
    const message = form.message ?? body.text;
    const html = body.html;

    if (!name || !email || !message) {
      return ctx.badRequest("Missing required fields");
    }

    // Save in database (recommended)
    await strapi.entityService.create(
      "api::support-request.support-request",
      {
        data: {
          name,
          email,
          phone,
          subject,
          message,
        },
      }
    );

    const supportTo =
      process.env.SUPPORT_REQUEST_TO ?? "victorhugocanal@gmail.com";

    // Send email to BTS staff
    await strapi.plugin("email").service("email").send({
      to: supportTo,
      replyTo: email,
      subject: `[BTS Support] ${subject}`,
      html:
        html ??
        `<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
<p><strong>Phone:</strong> ${phone ?? "N/A"}</p>
<p><strong>Subject:</strong> ${subject ?? ""}</p>
<p><strong>Message:</strong> ${message}</p>`,
      text: `
New Support Request

Name: ${name}
Email: ${email}
Phone: ${phone ?? "N/A"}

Message:
${message}
      `,
    });

    // Confirmation to requester
    await strapi.plugin("email").service("email").send({
      to: email,
      subject: `[BTS Support] We received your request`,
      html: `
<p>Hello ${name},</p>
<p>We received your support request and will respond as soon as possible.</p>
<hr />
<p><strong>Your message:</strong></p>
${html ?? `<p>${message}</p>`}
      `,
      text: `
Hello ${name},

We received your support request and will respond as soon as possible.

Your message:
${message}
      `,
    });

    return { success: true };
  },
};
