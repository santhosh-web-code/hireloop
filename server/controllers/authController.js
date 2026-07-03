import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sendEmail from '../utils/sendEmail.js';
import generateOTP from '../utils/generateOTP.js';

/**
 * Registers a new user (student, hr, or tpo).
 * Generates an email verification OTP and sends it via email.
 */
export const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      collegeName,
      companyName,
      branch,
      cgpa,
      backlogs,
      skills,
      resumeText,
    } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validity
    const isApproved = role === 'hr' ? false : true;

    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      collegeName: collegeName || null,
      companyName: companyName || null,
      branch: branch || null,
      cgpa: cgpa || null,
      backlogs: backlogs || 0,
      skills: skills || [],
      resumeText: resumeText || null,
      isApproved,
      isEmailVerified: false,
      otp,
      otpExpiry,
    });

    await newUser.save();

    // Construct highly styled HTML body for OTP email
    const subject = 'Verify your HireLoop Account - OTP';
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 24px; background: linear-gradient(135deg, #4f46e5, #6366f1); padding: 20px; border-radius: 6px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">HireLoop</h2>
          <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Verify your account</p>
        </div>
        <div style="color: #334155; line-height: 1.6; font-size: 15px;">
          <p style="margin-top: 0;">Hi <strong>${name}</strong>,</p>
          <p>Thank you for registering on HireLoop. Please use the following One-Time Password (OTP) to verify your email address:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 5px; color: #4f46e5; background-color: #f5f3ff; border: 2px dashed #6366f1; padding: 12px 28px; border-radius: 8px; display: inline-block;">
              ${otp}
            </span>
          </div>
          
          <p style="color: #ef4444; font-weight: 600; font-size: 14px; text-align: center; margin-bottom: 25px;">
            ⚠️ This OTP is valid for 10 minutes.
          </p>
          
          <p style="margin-bottom: 0; border-top: 1px solid #f1f5f9; padding-top: 15px; font-size: 13px; color: #64748b;">
            If you did not initiate this request, you can safely ignore this email.
          </p>
        </div>
      </div>
    `;

    await sendEmail(newUser.email, subject, html);

    return res.status(201).json({
      message: 'Registration successful. Please check your email for the OTP to verify your account.',
      email: newUser.email,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server error during registration' });
  }
};

/**
 * Verifies email verification OTP.
 * For students and TPOs, generates and returns a JWT upon successful verification.
 */
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already verified, please login' });
    }

    const now = new Date();
    if (user.otp !== otp || !user.otpExpiry || user.otpExpiry < now) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Mark as verified and clear OTP details
    user.isEmailVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    // HR profiles require manual TPO approval before token assignment
    if (user.role === 'hr') {
      return res.status(200).json({
        message: 'Email verified successfully. Your account is now pending TPO approval.',
        role: user.role,
      });
    }

    // Generate JWT for students and TPOs
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      token,
      role: user.role,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('OTP Verification error:', error);
    return res.status(500).json({ message: 'Internal server error during verification' });
  }
};

/**
 * Resends a fresh verification OTP if the email is registered but not verified.
 */
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already verified, please login' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    const subject = 'Verify your HireLoop Account - OTP';
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 24px; background: linear-gradient(135deg, #4f46e5, #6366f1); padding: 20px; border-radius: 6px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">HireLoop</h2>
          <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Verify your account</p>
        </div>
        <div style="color: #334155; line-height: 1.6; font-size: 15px;">
          <p style="margin-top: 0;">Hi <strong>${user.name}</strong>,</p>
          <p>You requested a new verification OTP. Please use the following One-Time Password (OTP) to verify your email address:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 5px; color: #4f46e5; background-color: #f5f3ff; border: 2px dashed #6366f1; padding: 12px 28px; border-radius: 8px; display: inline-block;">
              ${otp}
            </span>
          </div>
          
          <p style="color: #ef4444; font-weight: 600; font-size: 14px; text-align: center; margin-bottom: 25px;">
            ⚠️ This OTP is valid for 10 minutes.
          </p>
          
          <p style="margin-bottom: 0; border-top: 1px solid #f1f5f9; padding-top: 15px; font-size: 13px; color: #64748b;">
            If you did not initiate this request, you can safely ignore this email.
          </p>
        </div>
      </div>
    `;

    await sendEmail(user.email, subject, html);

    return res.status(200).json({ message: 'New OTP sent to your email.' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ message: 'Internal server error during resend OTP' });
  }
};

/**
 * Authenticates user credentials.
 * Checks verification and TPO approval flags. Generates JWT upon successful login.
 */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: 'Please verify your email first. Check your inbox for the OTP.',
        needsVerification: true,
        email: user.email,
      });
    }

    if (user.role === 'hr' && !user.isApproved) {
      return res.status(403).json({ message: 'Your HR account is pending TPO approval.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      token,
      role: user.role,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error during login' });
  }
};

/**
 * Initiates the forgot password flow by generating and mailing a reset OTP.
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    const subject = 'Reset your HireLoop Password - OTP';
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 24px; background: linear-gradient(135deg, #ef4444, #f87171); padding: 20px; border-radius: 6px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">HireLoop</h2>
          <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Password Reset Request</p>
        </div>
        <div style="color: #334155; line-height: 1.6; font-size: 15px;">
          <p style="margin-top: 0;">Hi <strong>${user.name}</strong>,</p>
          <p>We received a request to reset the password for your HireLoop account. Please use the following One-Time Password (OTP) to complete the reset process:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 5px; color: #ef4444; background-color: #fef2f2; border: 2px dashed #f87171; padding: 12px 28px; border-radius: 8px; display: inline-block;">
              ${otp}
            </span>
          </div>
          
          <p style="color: #ef4444; font-weight: 600; font-size: 14px; text-align: center; margin-bottom: 25px;">
            ⚠️ This OTP is valid for 10 minutes.
          </p>
          
          <p style="margin-bottom: 0; border-top: 1px solid #f1f5f9; padding-top: 15px; font-size: 13px; color: #64748b;">
            If you did not request a password reset, you can safely ignore this email.
          </p>
        </div>
      </div>
    `;

    await sendEmail(user.email, subject, html);

    return res.status(200).json({ message: 'OTP sent to your email for password reset.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Internal server error during forgot password' });
  }
};

/**
 * Resets the password if the provided OTP matches and has not expired.
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const now = new Date();
    if (user.otp !== otp || !user.otpExpiry || user.otpExpiry < now) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    return res.status(200).json({
      message: 'Password reset successful. Please login with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Internal server error during password reset' });
  }
};
