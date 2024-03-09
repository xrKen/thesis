const SITE_TITLE = 'Online LGU Katipunan Appointment System';
const User = require('../models/user');
const UserToken = require('../models/userToken');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { customAlphabet } = require('nanoid');
const sixDigitCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);


module.exports.index = (req, res) => {
    res.render('login', {
        site_title: SITE_TITLE,
        title: 'Login',
        currentUrl: req.originalUrl,
        messages: req.flash(),
    })
}

module.exports.submit = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (user) {
            const registrationToken = jwt.sign({ userId: user._id }, 'Reymond_Godoy_Secret7777', { expiresIn: '1d' });
            const verificationCode = sixDigitCode();
            const userToken = new UserToken({
                userId: user._id,
                token: registrationToken,
                verificationCode: verificationCode,
                expirationDate: new Date(new Date().getTime() + 24 * 5 * 60 * 1000),
                expirationCodeDate: new Date(new Date().getTime() + 5 * 60 * 1000), // 5 mins expiration
            });
            await userToken.save();
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'reyarmecinkenley@gmail.com',
                    pass: 'kfhx jxvz tesd pfwj',
                },
            });
            const sendEmail = async (from, to, subject, htmlContent) => {
                try {
                    const mailOptions = {
                        from,
                        to,
                        subject,
                        html: htmlContent,  // Set the HTML content
                    };
                    const info = await transporter.sendMail(mailOptions);
                    console.log('Email sent:', info.response);
                } catch (error) {
                    console.error('Error sending email:', error);
                    return res.status(500).render('500');
                }
            };
            // link
            const verificationLink = `http://polanco-registrar.onrender.com/verify?token=${registrationToken}`;
            const emailContent = `
            <div  style="width: 100%;display:flex;justify-content:center;align-items:center;">
                <div style="background-color: #f2f2f2; padding: 10px; width: 60%; text-align: justify;">
                    <h2 style="color: #000;">Dear ${user.fullname},</h2>
                    <p style="color: #000;">Welcome to our website! We're delighted that you've logged in. To begin exploring all the features and benefits our website has to offer, please confirm your email address.</p>
                    <p style="color: #000;">Your verification code is: <strong style="text-align: center;">${verificationCode}</strong></p>
                    <br/>
                    <p style="color: #000;">Requiring users to go through account confirmation is essential for maintaining the security and integrity of our platform. It helps reduce the number of unverified spam accounts, ensuring that our community remains safe and authentic.</p>
                    <br/>
                    <p style="color: #000;">Moreover, email verification is beneficial for users themselves. It minimizes the risk of them logging into an account using an incorrect or outdated email address, ensuring that they have access to important notifications and updates.</p>
                    <br/>
                    <p style="color: #000;">As we strive to provide a seamless and secure user experience, verifying user accounts helps us ensure that all accounts accessing our platform are valid and owned by genuine users like you.</p>
                    <br/>
                </div>
            </div>
                        `;
            sendEmail(
                'LGU-katipunan.onrender.com <reyarmecinkenley@gmail.com>',
                user.email,
                'Verify your email',
                emailContent
            );
            console.log('Verification email sent. Please verify your email to complete registration.');
            console.log('hello')
            return res.redirect(`/verify?token=${registrationToken}&sendcode=true`,);

        } else {
            req.flash('error', 'Forbidden: Please Contact Us For More Info!');
            return res.redirect('/login');
        }
    } catch (error) {
        req.flash('error', 'An error occurred.');
        console.log('error:', error)
        return res.status(500).render('500');
    }
}

module.exports.logout = (req, res) => {
    const loginId = req.session.login;
    req.session.destroy((err) => {
        if (err) {
            console.error('error destroying session', err);
        } else {
            console.log('user logout', loginId)
            res.redirect('/login');
        }
    })
}