export default {
  routes: [
    {
      method: "POST",
      path: "/support-requests/submit",
      handler: "support-request.submit",
      config: {
        auth: false, // public form
      },
    },
  ],
};
