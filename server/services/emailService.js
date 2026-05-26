const nodemailer = require('nodemailer');

// Set up transporter based on env variables
let transporter;

if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
} else {
  // Console logging and mock ethereal setup for local dev
  console.log('SMTP config not found in env. Setting up Ethereal mock SMTP transporter.');
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'ethereal.user@ethereal.email',
      pass: 'ethereal.pass'
    }
  });
}

// Helper to convert HTML to clean plain text to reduce spam score
const convertHtmlToText = (html) => {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '  * ')
    .replace(/<[^>]+>/g, '') // Strip remaining tags
    .replace(/&nbsp;/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive newlines
    .replace(/^\s+|\s+$/gm, ''); // Trim lines
};

/**
 * Send Evaluator Credentials & Subject Allocations Email
 */
exports.sendEvaluatorAllocationEmail = async ({ to, evaluatorName, password, subjectList, groupSubjectList }) => {
  try {
    const siteUrl = process.env.SITE_URL || 'http://localhost:5173';
    
    // Construct subject list HTML
    let subjectsHtml = '';
    if (subjectList && subjectList.length > 0) {
      subjectsHtml += '<p><strong>Core Theory Papers:</strong></p><ul>';
      subjectList.forEach(sub => {
        subjectsHtml += `<li><strong>${sub.subCode}</strong> - ${sub.subName} (Semester ${sub.semester || '—'})</li>`;
      });
      subjectsHtml += '</ul>';
    }
    
    if (groupSubjectList && groupSubjectList.length > 0) {
      subjectsHtml += '<p><strong>Group Pedagogy Subjects:</strong></p><ul>';
      groupSubjectList.forEach(name => {
        subjectsHtml += `<li><strong>${name}</strong> (B.Ed Pedagogy Subject)</li>`;
      });
      subjectsHtml += '</ul>';
    }

    const credentialsHtml = password
      ? `
        <p style="margin: 5px 0;"><strong>Username / Email:</strong> ${to}</p>
        <p style="margin: 5px 0;"><strong>Password:</strong> <span style="font-family: monospace; font-size: 14px; font-weight: bold; background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px; color: #0f766e;">${password}</span></p>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #64748b;"><em>Please log in using these secure credentials. You may change your password inside your portal settings if desired.</em></p>
      `
      : `
        <p style="margin: 5px 0;"><strong>Username / Email:</strong> ${to}</p>
        <p style="margin: 5px 0; font-size: 13px; color: #64748b;"><em>Use your existing portal password. If you are a newly registered evaluator, check your registration confirmation or click 'Forgot Password' on the login screen.</em></p>
      `;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-top: 0;">AKNU Digitization Portal - Subject Allocation</h2>
        <p>Dear <strong>${evaluatorName}</strong>,</p>
        <p>You have been allocated new subjects for digital lab record evaluation on the AKNU digitization portal.</p>
        
        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <h4 style="margin-top: 0; color: #15803d;">Your Access Credentials:</h4>
          ${credentialsHtml}
        </div>

        <h3 style="color: #0f766e;">Allocated Subjects for Evaluation:</h3>
        ${subjectsHtml || '<p style="color: #dc2626;"><em>No active subjects listed. Check your online dashboard.</em></p>'}
        
        <p style="margin-top: 30px;">
          Please log in to the portal using the link below to begin grading:
        </p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${siteUrl}/login" style="background-color: #0f766e; color: white; padding: 12px 25px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Log In to Evaluator Portal</a>
        </div>

        <p style="font-size: 12px; color: #64748b; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          This is an automated notification. Please do not reply to this email. For support, please contact your university digitisation administrator.
        </p>
      </div>
    `;

    const mailOptions = {
      from: `"AKNU Digitization Portal" <${process.env.SMTP_USER || 'no-reply@aknu.edu'}>`,
      to,
      subject: 'Subject Allocation Notification - AKNU Digitization Portal',
      html: htmlContent,
      text: convertHtmlToText(htmlContent).replace(/^\s+|\s+$/gm, '')
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email successfully sent to ${to}. Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Failed to send evaluator allocation email:', error);
    // Silent fail to prevent server crashes
  }
};

/**
 * Send Student Submission Deadline Reminder Email
 */
exports.sendStudentReminderEmail = async ({ to, studentName, subjectName, deadline }) => {
  try {
    const formattedDeadline = new Date(deadline).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #b45309; border-bottom: 2px solid #b45309; padding-bottom: 10px; margin-top: 0;">Submission Deadline Reminder</h2>
        <p>Dear <strong>${studentName}</strong>,</p>
        <p>This is a reminder that you have not yet submitted your digital lab record for the following subject:</p>
        
        <div style="background-color: #fffbeb; border-left: 4px solid #d97706; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 5px 0;"><strong>Subject:</strong> ${subjectName}</p>
          <p style="margin: 5px 0; color: #b45309; font-weight: bold;"><strong>Deadline:</strong> ${formattedDeadline}</p>
        </div>

        <p>Please log in to the student portal and submit your record before the deadline to avoid any evaluation delay or penalty.</p>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${process.env.SITE_URL || 'http://localhost:5173'}/login" style="background-color: #d97706; color: white; padding: 12px 25px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Upload Lab Record Now</a>
        </div>

        <p style="font-size: 12px; color: #64748b; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          This is an automated notification system. For any queries, please reach out to your college practical coordinator.
        </p>
      </div>
    `;

    const mailOptions = {
      from: `"AKNU Digitization Portal" <${process.env.SMTP_USER || 'no-reply@aknu.edu'}>`,
      to,
      subject: `URGENT: Lab Record Submission Deadline Reminder - ${subjectName}`,
      html: htmlContent,
      text: convertHtmlToText(htmlContent).replace(/^\s+|\s+$/gm, '')
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Reminder email sent to student ${to}`);
    return info;
  } catch (error) {
    console.error('Failed to send student reminder email:', error);
  }
};

/**
 * Send Principal Consolidated Unsubmitted Students Reminder Email
 */
exports.sendPrincipalReminderEmail = async ({ to, principalName, collegeName, unsubmittedRegdNos }) => {
  try {
    const listHtml = unsubmittedRegdNos.map(reg => `<li style="margin: 4px 0; font-family: monospace;">${reg}</li>`).join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #be123c; border-bottom: 2px solid #be123c; padding-bottom: 10px; margin-top: 0;">Unsubmitted Lab Records Notification</h2>
        <p>Dear Principal <strong>${principalName}</strong>,</p>
        <p>This is to inform you that the following student(s) from <strong>${collegeName}</strong> have not yet submitted their lab records for upcoming deadlines (today/tomorrow):</p>
        
        <div style="background-color: #fff1f2; border-left: 4px solid #e11d48; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <h4 style="margin-top: 0; color: #be123c;">Pending Registration Numbers (${unsubmittedRegdNos.length}):</h4>
          <ul style="padding-left: 20px; margin-bottom: 0;">
            ${listHtml}
          </ul>
        </div>

        <p>Please advise your college department heads to instruct these students to complete their uploads immediately.</p>
        
        <p style="font-size: 12px; color: #64748b; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          This is an administrative update. Please do not reply.
        </p>
      </div>
    `;

    const mailOptions = {
      from: `"AKNU Digitization Portal" <${process.env.SMTP_USER || 'no-reply@aknu.edu'}>`,
      to,
      subject: `ALERT: Unsubmitted Student Records - ${collegeName}`,
      html: htmlContent,
      text: convertHtmlToText(htmlContent).replace(/^\s+|\s+$/gm, '')
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Reminder email sent to Principal ${to}`);
    return info;
  } catch (error) {
    console.error('Failed to send principal reminder email:', error);
  }
};

/**
 * Send Evaluator Unsubmitted Assignments Reminder Email
 */
exports.sendEvaluatorReminderEmail = async ({ to, evaluatorName, unsubmittedRegdNos }) => {
  try {
    const listHtml = unsubmittedRegdNos.map(reg => `<li style="margin: 4px 0; font-family: monospace;">${reg}</li>`).join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0369a1; border-bottom: 2px solid #0369a1; padding-bottom: 10px; margin-top: 0;">Assigned Students Pending Submission</h2>
        <p>Dear <strong>${evaluatorName}</strong>,</p>
        <p>This is to notify you that the following student(s) allocated to your subjects have not yet submitted their lab records for upcoming deadlines:</p>
        
        <div style="background-color: #f0f9ff; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <h4 style="margin-top: 0; color: #0369a1;">Unsubmitted Registration Numbers (${unsubmittedRegdNos.length}):</h4>
          <ul style="padding-left: 20px; margin-bottom: 0;">
            ${listHtml}
          </ul>
        </div>

        <p>These records will be available in your portal for valuation immediately upon student submission.</p>
        
        <p style="font-size: 12px; color: #64748b; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          This is an automated status update.
        </p>
      </div>
    `;

    const mailOptions = {
      from: `"AKNU Digitization Portal" <${process.env.SMTP_USER || 'no-reply@aknu.edu'}>`,
      to,
      subject: `Allocation Status: Pending Student Submissions`,
      html: htmlContent,
      text: convertHtmlToText(htmlContent).replace(/^\s+|\s+$/gm, '')
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Reminder email sent to Evaluator ${to}`);
    return info;
  } catch (error) {
    console.error('Failed to send evaluator reminder email:', error);
  }
};

/**
 * Send Student Registration Verification OTP Email
 */
exports.sendStudentOtpEmail = async ({ to, studentName, otp }) => {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-top: 0;">Student Portal Verification</h2>
        <p>Dear Student <strong>${studentName}</strong>,</p>
        <p>You have initiated the first-time setup on the B.Ed practical digitization portal.</p>
        
        <div style="background-color: #f0fdf4; border-left: 4px solid #0f766e; padding: 20px; margin: 20px 0; border-radius: 4px; text-align: center;">
          <h4 style="margin-top: 0; color: #0f766e; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Verification OTP:</h4>
          <p style="margin: 10px 0; font-size: 32px; font-weight: bold; color: #0f766e; letter-spacing: 5px;">${otp}</p>
          <p style="margin: 0; font-size: 12px; color: #64748b;"><em>This verification code is valid for 5 minutes. Please do not share this code with anyone.</em></p>
        </div>

        <p style="font-size: 12px; color: #64748b; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          This is an automated verification message. Please do not reply to this email. For support, please contact your university digitisation administrator.
        </p>
      </div>
    `;

    const mailOptions = {
      from: `"AKNU Digitization Portal" <${process.env.SMTP_USER || 'no-reply@aknu.edu'}>`,
      to,
      subject: `${otp} is your verification code for B.Ed Portal Setup`,
      html: htmlContent,
      text: convertHtmlToText(htmlContent).replace(/^\s+|\s+$/gm, '')
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Verification OTP email successfully sent to ${to}. Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Failed to send student OTP email:', error);
    // Return mock success to allow local testing if email fails
    return { mock: true };
  }
};

/**
 * Send Student Subject Assignment Notification Email
 */
exports.sendStudentAssignmentNotificationEmail = async ({ to, studentName, subjectNames, deadline }) => {
  try {
    const siteUrl = process.env.SITE_URL || 'http://localhost:5173';
    const formattedDeadline = new Date(deadline).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const listHtml = subjectNames.map(name => `<li style="margin: 6px 0; font-weight: bold; color: #0f766e;">${name}</li>`).join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <h2 style="color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-top: 0;">AKNU Digitization Portal - New Subject Allocation</h2>
        <p>Dear <strong>${studentName}</strong>,</p>
        <p>This is to inform you that new practical record assignments have been generated and allocated to you on the Adikavi Nannaya University (AKNU) Digitization Portal.</p>
        
        <div style="background-color: #f0fdf4; border-left: 4px solid #0f766e; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <h4 style="margin-top: 0; color: #0f766e; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px;">Allocated Practical Subject(s):</h4>
          <ul style="padding-left: 20px; margin-bottom: 0;">
            ${listHtml}
          </ul>
        </div>

        <div style="background-color: #fffbeb; border-left: 4px solid #d97706; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <h4 style="margin-top: 0; color: #b45309; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px;">Important Action Required:</h4>
          <p style="margin: 5px 0;"><strong>Submission Deadline:</strong> <span style="color: #dc2626; font-weight: bold; font-size: 15px;">${formattedDeadline}</span></p>
          <p style="margin: 5px 0; font-size: 13px; color: #475569;">Please upload your completed practical lab records before the deadline to ensure timely evaluation.</p>
        </div>

        <div style="background-color: #f1f5f9; padding: 15px; margin: 20px 0; border-radius: 4px; border: 1px solid #cbd5e1;">
          <h4 style="margin-top: 0; color: #334155; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px;">First-Time Registration / Login Instructions:</h4>
          <p style="margin: 5px 0; font-size: 13px; color: #475569;">If you are a first-time user and haven't created a password yet, please complete your registration wizard using the portal website link:</p>
          <ol style="padding-left: 20px; margin-top: 10px; font-size: 13px; color: #334155;">
            <li>Go to the portal website: <a href="${siteUrl}" style="color: #0f766e; font-weight: bold; text-decoration: underline;">${siteUrl}</a></li>
            <li>Click on <strong>"Register / First Time Setup"</strong> or go directly to <a href="${siteUrl}/register" style="color: #0f766e; font-weight: bold; text-decoration: underline;">${siteUrl}/register</a></li>
            <li>Enter your <strong>Registration Number</strong> and **Email Address**.</li>
            <li>Verify the OTP code sent to your email and create your secure password!</li>
          </ol>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${siteUrl}/login" style="background-color: #0f766e; color: white; padding: 12px 25px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Access Student Portal</a>
        </div>

        <p style="font-size: 12px; color: #64748b; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          This is an automated administrative notification. Please do not reply directly to this email. For any queries, contact your college practical coordinator.
        </p>
      </div>
    `;

    const mailOptions = {
      from: `"AKNU Digitization Portal" <${process.env.SMTP_USER || 'no-reply@aknu.edu'}>`,
      to,
      subject: `New Practical Subject Allocation Notification - ${formattedDeadline}`,
      html: htmlContent,
      text: convertHtmlToText(htmlContent).replace(/^\s+|\s+$/gm, '')
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Student allocation notification email successfully sent to ${to}. Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Failed to send student assignment notification email:', error);
  }
};

/**
 * Send Principal Onboarding / Registration Email
 */
exports.sendPrincipalOnboardingEmail = async ({ to, principalName, collegeName }) => {
  try {
    const siteUrl = process.env.SITE_URL || 'http://localhost:5173';
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <h2 style="color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-top: 0;">Welcome to AKNU Digitization Portal</h2>
        <p>Dear <strong>${principalName}</strong>,</p>
        <p>Your Principal account for <strong>${collegeName}</strong> has been successfully pre-allocated by the university administration on the AKNU Digitization Portal.</p>
        
        <div style="background-color: #fffbeb; border-left: 4px solid #d97706; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <h4 style="margin-top: 0; color: #b45309; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px;">Account Activation Required</h4>
          <p style="margin: 5px 0; font-size: 13px; color: #475569;">Before you can log in, you must verify your email address and create a secure password.</p>
        </div>

        <div style="background-color: #f1f5f9; padding: 15px; margin: 20px 0; border-radius: 4px; border: 1px solid #cbd5e1;">
          <h4 style="margin-top: 0; color: #334155; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px;">Setup Instructions:</h4>
          <ol style="padding-left: 20px; margin-top: 10px; font-size: 13px; color: #334155;">
            <li>Go to the registration page: <a href="${siteUrl}/register" style="color: #0f766e; font-weight: bold; text-decoration: underline;">${siteUrl}/register</a></li>
            <li>Select your college in the first input field: <strong>${collegeName}</strong></li>
            <li>Enter this email address in the <strong>Email</strong> field.</li>
            <li>Verify the OTP code sent to your inbox and create your password!. If email is not received, please check your spam folder.</li>
          </ol>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${siteUrl}/register" style="background-color: #0f766e; color: white; padding: 12px 25px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Create Your Account</a>
        </div>

        <p style="font-size: 12px; color: #64748b; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          This is an automated administrative notification. For any queries, please contact the university digitization administrator.
        </p>
      </div>
    `;

    const mailOptions = {
      from: `"AKNU Digitization Portal" <${process.env.SMTP_USER || 'no-reply@aknu.edu'}>`,
      to,
      subject: `Action Required: Create Your Principal Account for ${collegeName}`,
      html: htmlContent,
      text: convertHtmlToText(htmlContent).replace(/^\s+|\s+$/gm, '')
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Principal onboarding email successfully sent to ${to}. Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Failed to send principal onboarding email:', error);
  }
};

/**
 * Send Student Deadline Reminder Email
 */
exports.sendStudentDeadlineReminderEmail = async ({ to, studentName, daysLeft }) => {
  try {
    const siteUrl = process.env.SITE_URL || 'http://localhost:5173';
    const urgency = daysLeft === 0 ? 'TODAY' : 'TOMORROW';
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <h2 style="color: #b91c1c; border-bottom: 2px solid #b91c1c; padding-bottom: 10px; margin-top: 0;">Urgent: Record Submission Deadline</h2>
        <p>Dear <strong>${studentName}</strong>,</p>
        <p>This is a reminder that the deadline to upload your assigned practical records is <strong>${urgency}</strong>.</p>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <h4 style="margin-top: 0; color: #991b1b; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px;">Action Required</h4>
          <p style="margin: 5px 0; font-size: 13px; color: #475569;">Please log in to the portal immediately and upload your pending records to avoid academic penalties.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${siteUrl}/login" style="background-color: #0f766e; color: white; padding: 12px 25px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Log In to Portal</a>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"AKNU Digitization Portal" <${process.env.SMTP_USER || 'no-reply@aknu.edu'}>`,
      to,
      subject: `Action Required: Record Submission Deadline is ${urgency}`,
      html: htmlContent,
      text: convertHtmlToText(htmlContent).replace(/^\s+|\s+$/gm, '')
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Student reminder email sent to ${to}`);
    return info;
  } catch (error) {
    console.error('Failed to send student reminder email:', error);
  }
};

/**
 * Send Principal Deadline Reminder Email
 */
exports.sendPrincipalDeadlineReminderEmail = async ({ to, principalName, daysLeft, defaultingStudents }) => {
  try {
    const siteUrl = process.env.SITE_URL || 'http://localhost:5173';
    const urgency = daysLeft === 0 ? 'TODAY' : 'TOMORROW';
    
    // Create HTML table rows for students
    const studentRows = defaultingStudents.map(student => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 13px;">${student.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 13px; font-family: monospace;">${student.regdNo}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 13px;">${student.email || 'N/A'}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <h2 style="color: #b91c1c; border-bottom: 2px solid #b91c1c; padding-bottom: 10px; margin-top: 0;">Urgent: Defaulting Students List</h2>
        <p>Dear <strong>${principalName}</strong>,</p>
        <p>This is a notification that several students from your college have not yet submitted their practical records. The deadline is <strong>${urgency}</strong>.</p>
        
        <p style="color: #475569; font-size: 14px; margin-bottom: 10px;">Please coordinate with the following students:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e2e8f0;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: left;">
              <th style="padding: 10px 8px; font-size: 12px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1;">Student Name</th>
              <th style="padding: 10px 8px; font-size: 12px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1;">Reg No</th>
              <th style="padding: 10px 8px; font-size: 12px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1;">Email Address</th>
            </tr>
          </thead>
          <tbody>
            ${studentRows}
          </tbody>
        </table>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${siteUrl}/login" style="background-color: #0f766e; color: white; padding: 12px 25px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Log In to Portal for Details</a>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"AKNU Digitization Portal" <${process.env.SMTP_USER || 'no-reply@aknu.edu'}>`,
      to,
      subject: `Urgent: Defaulting Students Alert - Deadline ${urgency}`,
      html: htmlContent,
      text: convertHtmlToText(htmlContent).replace(/^\s+|\s+$/gm, '')
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Principal reminder email sent to ${to}`);
    return info;
  } catch (error) {
    console.error('Failed to send principal reminder email:', error);
  }
};

/**
 * Send Evaluator Deadline Reminder Email
 */
exports.sendEvaluatorDeadlineReminderEmail = async ({ to, evaluatorName, daysLeft, pendingCount }) => {
  try {
    const siteUrl = process.env.SITE_URL || 'http://localhost:5173';
    const urgency = daysLeft === 0 ? 'TODAY' : 'TOMORROW';
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <h2 style="color: #b91c1c; border-bottom: 2px solid #b91c1c; padding-bottom: 10px; margin-top: 0;">Urgent: Evaluation Deadline</h2>
        <p>Dear <strong>${evaluatorName}</strong>,</p>
        <p>This is a reminder that the deadline to evaluate your assigned practical records is <strong>${urgency}</strong>.</p>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <h4 style="margin-top: 0; color: #991b1b; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px;">Action Required</h4>
          <p style="margin: 5px 0; font-size: 13px; color: #475569;">You currently have <strong>${pendingCount}</strong> record(s) pending evaluation. Please log in and complete your evaluations.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${siteUrl}/login" style="background-color: #0f766e; color: white; padding: 12px 25px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Log In to Portal</a>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"AKNU Digitization Portal" <${process.env.SMTP_USER || 'no-reply@aknu.edu'}>`,
      to,
      subject: `Action Required: Evaluation Deadline is ${urgency}`,
      html: htmlContent,
      text: convertHtmlToText(htmlContent).replace(/^\s+|\s+$/gm, '')
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Evaluator reminder email sent to ${to}`);
    return info;
  } catch (error) {
    console.error('Failed to send evaluator reminder email:', error);
  }
};


