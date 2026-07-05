const sendEmail = async (to, subject, html) => {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': process.env.BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: {
          name: "HireLoop",
          email: process.env.EMAIL_FROM
        },
        to: [
          {
            email: to
          }
        ],
        subject: subject,
        htmlContent: html
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Brevo Email API Error status: ${response.status}`);
      console.error(`Brevo Email API Error body: ${errorBody}`);
      return null;
    }

    const data = await response.json();
    console.log("Brevo Email API Success");
    return data;
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    return null;
  }
};

export default sendEmail;
