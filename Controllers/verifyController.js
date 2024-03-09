const SITE_TITLE = 'CAR';
const User = require('../models/user');
const UserToken = require('../models/userToken');
//token
const jwt = require('jsonwebtoken');
//sender mailer
const nodemailer = require('nodemailer');
const { customAlphabet } = require('nanoid');
const sixDigitCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

module.exports.verify = async (req, res) => {
    try {
        const verificationToken = req.query.token;
        const sendcode = req.query.sendcode === 'true';
        if (!verificationToken) {
            const userLogin = await User.findById(req.session.login)
            return res.status(404).render('404', {
                login: req.session.login,
                userLogin: userLogin,
            });
        }
        // Checking
        const userToken = await UserToken.findOne({ token: verificationToken });
        // Checking 
        if (!userToken) {
            const userLogin = await User.findById(req.session.login)
            return res.status(404).render('404', {
                login: req.session.login,
                userLogin: userLogin,
            });
        }
        const expirationCodeDate = userToken.expirationCodeDate;
        const remainingTimeInSeconds = Math.floor((expirationCodeDate - new Date().getTime()) / 1000);
        if (!userToken || userToken.expirationDate < new Date()) {
            const userLogin = await User.findById(req.session.login)
            return res.status(404).render('404', {
                login: req.session.login,
                userLogin: userLogin,
            });
        }
        const user = await User.findById({ _id: userToken.userId });
        res.render('verify', {
            site_title: SITE_TITLE,
            title: 'Verify',
            session: req.session,
            currentUrl: req.originalUrl,
            adjustedExpirationTimestamp: remainingTimeInSeconds,
            userToken: userToken,
            sendcode: sendcode,
            user: user,
            messages: req.flash(),
            verificationToken:verificationToken,
        });
    } catch (error) {
        console.error('Error rendering verification input form:', error);
        return res.status(500).render('500');
    }
};

module.exports.doVerify = async (req, res) => {
    var action = req.body.action;
    const verificationToken = req.body.token;
    if (action === 'submit') {
        try {
            const verificationCode = req.body.verificationCode;
            const decodedToken = jwt.verify(verificationToken, 'Reymond_Godoy_Secret7777');
            // Checking
            const userToken = await UserToken.findOne({ userId: decodedToken.userId, token: verificationToken });
            if (userToken && userToken.expirationDate > new Date()) {
                console.log(userToken.verificationCode)
                if (verificationCode === userToken.verificationCode) {
                    if (userToken.expirationCodeDate > new Date()) {
                        const user = await User.findByIdAndUpdate(decodedToken.userId, { isVerified: true });
                        req.session.login = user._id;
                        await UserToken.findByIdAndDelete(userToken._id);
                        console.log('Email verification successful. Registration completed.');
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
                                throw new Error('Failed to send email');
                            }
                        };
                        const emailContent = `
                        <div style="width: 100%; display: flex; justify-content: center; align-items: center;">
                            <div style="background-color: #f2f2f2; padding: 10px; width: 60%; text-align: justify;">
                                <h2 style="color: #000;">Dear ${user.fullname},</h2>
                                <p style="color: #000;">Congratulations! Your email address has been successfully verified. Welcome aboard!</p>
                                <br/>
                                <p style="color: #000;">You are now a part of our community, and we're thrilled to have you join us. Feel free to explore all the features and benefits our website has to offer.</p>
                                <br/>
                                <p style="color: #000;">Should you have any questions or need assistance, don't hesitate to reach out to our support team. We're here to help you make the most out of your experience.</p>
                                <br/>
                                <p style="color: #000;">Thank you for choosing our platform. We look forward to serving you and providing you with an exceptional user experience.</p>
                                <br/>
                                <p style="color: #000;">Best regards,</p>
                                <a href="LGU-katipunan.onrender.com">LGU-katipunan.onrender.com</a>
                            </div>
                        </div>
                        `;
                        sendEmail(
                            'LGU-katipunan.onrender.com <reyarmecinkenley@gmail.com>',
                            user.email,
                            'Verify your email',
                            emailContent
                        );
                        if (user.role === 'admin') {
                            return res.redirect(`/admin`);
                        } else if (user.role === 'creator') {
                            return res.redirect(`/vehicles`);
                        } else if (user.role === 'member') {
                            return res.redirect(`/`);
                        } else {
                            console.log('hello')
                        }
                    } else {
                        console.log('Code expired', userToken.expirationCodeDate)
                        req.flash('error', 'Code has been expired.');
                        res.redirect(`/verify?token=${verificationToken}`);
                    }
                } else {
                    console.log('Verification code does not match');
                    req.flash('error', 'The code does not match.');
                    res.redirect(`/verify?token=${verificationToken}`);
                }
            } else {
                console.log('Invalid or expired verification code.');
                const userLogin = await User.findById(req.session.login)
                return res.status(404).render('404', {
                    login: req.session.login,
                    userLogin: userLogin,
                });
            }
        } catch (error) {
            console.error('Verification failed:', error);
            return res.status(500).render('500');
        }
    } else if (action === 'resend') {
        try {
            const decodedToken = jwt.verify(verificationToken, 'Reymond_Godoy_Secret7777');
            const userToken = await UserToken.findOne({ userId: decodedToken.userId, token: verificationToken });
            const user = await User.findById({ _id: userToken.userId });
            if (userToken) {
                console.log(user._id);
                const verificationCode = sixDigitCode();
                if (verificationToken === userToken.token) {
                    const updateCode = {
                        verificationCode: verificationCode,
                        expirationCodeDate: new Date(new Date().getTime() + 5 * 60 * 1000),
                    };
                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: 'reyarmecinkenley@gmail.com',
                            pass: 'kfhx jxvz tesd pfwj',
                        },
                    });
                    // Function to send an email
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
                    const verificationLink = `http://LGU-katipunan.onrender.com/verify?token=${verificationToken}`;
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
                        'Verify Resend code email',
                        emailContent
                    );
                    console.log('Code Resend Successfully!');
                    const updatedCode = await UserToken.findByIdAndUpdate(userToken._id, updateCode, {
                        new: true
                    });
                    if (updatedCode) {
                        console.log('code has been updated', updatedCode);
                        console.log(user);
                        res.redirect(`/verify?token=${verificationToken}&sendcode=true`);
                    } else {
                        console.log('Error updating code: Code not found or update unsuccessful');
                    }
                } else {
                    // Codes in req.body do not match
                    console.log('Verification codes do not match.');
                    const userLogin = await User.findById(req.session.login)
                    return res.status(404).render('404', {
                        login: req.session.login,
                        userLogin: userLogin,
                    });
                }
            }
        } catch (err) {
            console.log('no token', err);
        }
    } else if (action === 'cancel') {
        const decodedToken = jwt.verify(verificationToken, 'Reymond_Godoy_Secret7777');
        const userToken = await UserToken.findOne({ userId: decodedToken.userId, token: verificationToken });
        try {
            await User.findByIdAndDelete(decodedToken.userId);
            await UserToken.findByIdAndDelete(userToken._id);
            res.redirect('/register')
        } catch (error) {
            console.error('Deletion error:', error.message);
            return res.status(500).render('500');
        }
    } else {
        //this must be status 400 invalid action
        return res.status(500).render('500');
    }
};