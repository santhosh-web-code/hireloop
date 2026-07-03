import sendEmail from './sendEmail.js';

/**
 * Sends an email notification to a student when their application status changes.
 * 
 * @param {string} studentEmail - Recipient email address
 * @param {string} studentName - Student's name
 * @param {string} companyName - Company name
 * @param {string} status - New application status
 */
const notifyStatusChange = async (studentEmail, studentName, companyName, status) => {
  const subject = 'Application Status Update - HireLoop';
  
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #4f46e5, #6366f1); padding: 24px; border-radius: 6px 6px 0 0; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">HireLoop</h2>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Placement Management System</p>
      </div>
      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <p style="font-size: 16px; margin-top: 0;">Dear <strong>${studentName}</strong>,</p>
        <p style="font-size: 15px; color: #475569;">There is an update regarding your job application status.</p>
        
        <div style="margin: 24px 0; padding: 18px; background-color: #f8fafc; border-left: 4px solid #4f46e5; border-radius: 4px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; font-size: 14px; color: #64748b; font-weight: 600; width: 120px;">Company:</td>
              <td style="padding: 4px 0; font-size: 15px; color: #0f172a; font-weight: 700;">${companyName}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-size: 14px; color: #64748b; font-weight: 600;">New Status:</td>
              <td style="padding: 4px 0;">
                <span style="font-size: 14px; color: #4f46e5; font-weight: 700; background-color: #e0e7ff; padding: 4px 10px; border-radius: 4px; display: inline-block;">
                  ${status.toUpperCase()}
                </span>
              </td>
            </tr>
          </table>
        </div>
        
        <p style="font-size: 15px; color: #475569;">Please log in to the HireLoop portal to view additional feedback and next steps.</p>
        
        <div style="margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px;">
          <p style="font-size: 15px; margin: 0; color: #334155;">Best regards,</p>
          <p style="font-size: 15px; margin: 5px 0 0 0; color: #4f46e5; font-weight: 600;">HireLoop Placement Team</p>
        </div>
      </div>
      <div style="text-align: center; padding: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; margin-top: 20px;">
        This is an automated notification. Please do not reply to this email directly.
      </div>
    </div>
  `;

  await sendEmail(studentEmail, subject, html);
};

export default notifyStatusChange;
