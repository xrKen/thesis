const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');
const SITE_TITLE = 'Online LGU Katipunan Appointment System'
const User = require('../models/user');
const requestedForm = require('../models/request');
const Vehicle = require('../models/vehicle');

module.exports.index = async (req, res) => {
    const login = req.session.login;
    const userLogin = await User.findById(login);
    try {
        if (userLogin) {
            if (userLogin.role === 'creator') {
                //date
                const currentDate = new Date();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                const day = String(currentDate.getDate()).padStart(2, '0');
                const year = currentDate.getFullYear();
                const formattedDate = `${month}-${day}-${year}`;
                const submissionCount = await requestedForm.countDocuments({ dateCreated: formattedDate });
                //end date
                const UserIdlogin = req.session.login;
                const users = await User.find();
                const user = await User.findById(UserIdlogin);
                const reqForm = await requestedForm.find({ userId: user._id });
                const reqForms = await requestedForm.find();
                const vehicle = await Vehicle.find();
                const vehicles = await Vehicle.find();
                res.render('creator', {
                    site_title: SITE_TITLE,
                    title: 'Home',
                    currentUrl: req.originalUrl,
                    users: users,
                    user: user,
                    reqForm: reqForm,
                    reqForms: reqForms,
                    messages: req.flash(),
                    vehicles: vehicles,
                    submissionCount:submissionCount,
                })
            } else {
                if (userLogin.role === 'member') {
                    return res.redirect('/');
                } else if (userLogin.role === 'admin') {
                    return res.redirect('/admin');
                } else if (userLogin.role === 'creator') {
                    return res.redirect('/vehicles');
                } else {
                    console.log('Unknown role logged in');
                }
            }
        } else {
            return res.redirect('/login')
        }
    } catch (err) {
        console.log('err:', err);
        req.flash('error', 'An error occurred.');
        return res.status(500).render('500');
    }
}
module.exports.approve = async (req, res) => {
    const actions = req.body.actions;
    if (actions === 'approve') {
        const formId = req.body.formId;
        try {
            const requestForm = await requestedForm.findById(formId);

            // Check not equal to 0
            const allQuantitiesNonZero = await Promise.all(requestForm.selectedVehicle.map(async (selectedVehicle) => {
                const vehicleCount = await Vehicle.countDocuments({ type: selectedVehicle.vehicleId, qty: { $gt: 0 }, status: 'available' });
                return vehicleCount >= selectedVehicle.qty;
            }));

            // Check if all selected not equal to 0
            if (allQuantitiesNonZero.every(quantity => quantity)) {
                await Promise.all(requestForm.selectedVehicle.map(async (selectedVehicle) => {
                    // Find and update the required number of vehicles of this type
                    const vehiclesToUpdate = await Vehicle.find({ type: selectedVehicle.vehicleId, qty: { $gt: 0 }, status: 'available' }).limit(selectedVehicle.qty);
                    await Promise.all(vehiclesToUpdate.map(async (vehicle) => {
                        vehicle.qty = 0;
                        vehicle.status = 'process';
                        await vehicle.save();
                    }));
                }));


                await requestedForm.findByIdAndUpdate(formId, { status: 'process' });
                req.flash('message', 'Approved');

                //
                const user = await User.findById(req.session.login);
                const requestUser = await User.findById(requestForm.userId)
                const createdBy = requestForm.userId.toString();
                const savedRequestIdString = requestForm._id.toString();
                const savedRequestNameString = requestForm.requestorName.toString();
                const formURL = `public/upload/pdf/${createdBy}/${savedRequestNameString}`;
                const outputFolderPath = path.resolve(__dirname, '../public/upload/pdf/', createdBy, savedRequestNameString);
                const outputPath = path.join(outputFolderPath, `${savedRequestIdString}.pdf`);
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'emonawong22@gmail.com',
                        pass: 'nouv heik zbln qkhf',
                    },
                });

                // Function to send email
                const sendEmail = async (from, to, subject, htmlContent, outputPath) => {
                    try {
                        const pdfBuffer = fs.readFile(outputPath);

                        // Convert the PDF buffer to base64
                        const pdfBase64 = pdfBuffer.toString('base64');

                        // Construct the data URI for the inline PDF attachment
                        const pdfDataUri = `data:application/pdf;base64,${pdfBase64}`;
                        const mailOptions = {
                            from,
                            to,
                            subject,
                            html: htmlContent,
                            attachments: [
                                {
                                    filename: `${requestForm._id}.pdf`,
                                    content: pdfDataUri,
                                    encoding: 'base64',
                                    contentType: 'application/pdf',
                                    path: outputPath
                                },
                            ],
                        };
                        const info = await transporter.sendMail(mailOptions);
                        console.log('Email sent:', info.response);
                    } catch (error) {
                        console.error('Error sending email:', error);
                        req.flash('message', 'Something went wrong, Please check your internet');
                        return res.status(500).render('500');
                    }
                };
                const Link = `https://lguk-online.onrender.com/admin`;
                const emailContent = `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <p style="color: #000; font-size:18px;">This is: <strong>${user.fullname}</strong> (${user.role})</p>
                    <p style="color: #000;">The request of <strong>${requestForm.requestorName}</strong> is waiting for your approval.</p>
                    <p>Go to <a href="${Link}" >Dashboard</a> </p>
                </div>
            `;
                sendEmail(
                    `lguk-online.onrender.com <${user.email}>`,
                    //sending message in two emails
                    `reyarmecinkenley@gmail.com`,
                    'Request Form',
                    emailContent,
                    outputPath
                );
                return res.status(200).redirect('/vehicles');
            } else {
                req.flash('message', 'Cannot approve form. Some selected vehicles have insufficient quantity.');
                return res.status(400).redirect('/vehicles');
            }

        } catch (error) {
            console.error('Error approving request:', error);
            req.flash('error', 'An error occurred.');
            return res.status(500).render('500');
        }
    } else if (actions === 'decline') {

        console.log('decline');
        const formId = req.body.formId;
        try {
            const requestForm = await requestedForm.findById(formId);
            
            if (requestForm) {
                //
                const user = await User.findById(req.session.login);
                const requestUser = await User.findById(requestForm.userId)
                const createdBy = requestForm.userId.toString();
                const savedRequestIdString = requestForm._id.toString();
                const savedRequestNameString = requestForm.requestorName.toString();
                const formURL = `public/upload/pdf/${createdBy}/${savedRequestNameString}`;
                const outputFolderPath = path.resolve(__dirname, '../public/upload/pdf/', createdBy, savedRequestNameString);
                const outputPath = path.join(outputFolderPath, `${savedRequestIdString}.pdf`);
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'emonawong22@gmail.com',
                        pass: 'nouv heik zbln qkhf',
                    },
                });

                // Function to send email
                const sendEmail = async (from, to, subject, htmlContent, outputPath) => {
                    try {
                        const pdfBuffer = fs.readFile(outputPath);

                        // Convert the PDF buffer to base64
                        const pdfBase64 = pdfBuffer.toString('base64');

                        // Construct the data URI for the inline PDF attachment
                        const pdfDataUri = `data:application/pdf;base64,${pdfBase64}`;
                        const mailOptions = {
                            from,
                            to,
                            subject,
                            html: htmlContent,
                            attachments: [
                                {
                                    filename: `${requestForm._id}.pdf`,
                                    content: pdfDataUri,
                                    encoding: 'base64',
                                    contentType: 'application/pdf',
                                    path: outputPath
                                },
                            ],
                        };
                        const info = await transporter.sendMail(mailOptions);
                        console.log('Email sent:', info.response);
                    } catch (error) {
                        console.error('Error sending email:', error);
                        req.flash('message', 'Something went wrong, Please check your internet');
                        return res.status(500).render('500');
                    }
                };
                const Link = `https://lguk-online.onrender.com/`;
                const emailContent = `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <p style="color: #000; font-size:18px;">This is: <strong>${user.fullname}</strong> (${user.role})</p>
                    <p style="color: #000;">The request of <strong>${requestForm.requestorName}</strong>has been declined.</p>
                    <p>Go to <a href="${Link}" >Dashboard</a> </p>
                </div>
            `;
                sendEmail(
                    `lguk-online.onrender.com <${user.email}>`,
                    //sending message in two emails
                    `${requestUser.email}`,
                    'Request Form',
                    emailContent,
                    outputPath
                );
                await requestedForm.findByIdAndUpdate(formId, { status: 'declined' }, { new: true });
                req.flash('message', 'Request Decline Successfully!');
                return res.status(200).redirect('/vehicles');
            } else {
                req.flash('message', 'error sending message!');
                return res.status(400).redirect('/vehicles');
            }
        } catch (error) {
            console.error('Error approving request:', error);
        }
    } else {
        console.log('Default logic goes here');
    }
}
module.exports.remove = async (req, res) => {
    const formId = req.body.formId;
    try {
        const requestForm = await requestedForm.findById(formId);
        // Check if all selected vehicles have non-zero quantities
        const allQuantitiesNonZero = await Promise.all(requestForm.selectedVehicle.map(async (selectedVehicle) => {
            const vehicleCount = await Vehicle.countDocuments({ type: selectedVehicle.vehicleId, qty: 0, status: 'process' });
            return vehicleCount >= selectedVehicle.qty;
        }));
        // Check if all selected vehicles have non-zero quantities
        if (allQuantitiesNonZero.every(quantity => quantity)) {
            await Promise.all(requestForm.selectedVehicle.map(async (selectedVehicle) => {
                const vehiclesToUpdate = await Vehicle.find({ type: selectedVehicle.vehicleId, qty: 0, status: 'process' }).limit(selectedVehicle.qty);
                await Promise.all(vehiclesToUpdate.map(async (vehicle) => {
                    vehicle.qty = 1;
                    vehicle.status = 'available';
                    await vehicle.save();
                }));
            }));
            await requestedForm.findByIdAndUpdate(formId, { status: 'pending' });
            req.flash('message', 'Request Cancelled Successfully!');
            return res.status(200).redirect('/vehicles');
        } else {
            req.flash('message', 's');
            return res.status(400).redirect('/vehicles');
        }
    } catch (error) {
        console.error('Error approving request:', error);
    }
}

module.exports.inventory = async (req, res) => {
    const UserIdlogin = req.session.login;
    const user = await User.findById(UserIdlogin);
    if (user) {
        if (user.role === 'creator') {
            //date
            const currentDate = new Date();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            const year = currentDate.getFullYear();
            const formattedDate = `${month}-${day}-${year}`;
            const submissionCount = await requestedForm.countDocuments({ dateCreated: formattedDate });
            //end date
            const reqForm = await requestedForm.find({ userId: user._id });
            const reqForms = await requestedForm.find();
            const vehicles = await Vehicle.find();
            res.render('creator_vehicles', {
                site_title: SITE_TITLE,
                title: 'Dashboard',
                currentUrl: req.originalUrl,
                user: user,
                reqForm:reqForm,
                reqForms: reqForms,
                messages: req.flash(),
                vehicles: vehicles,
                submissionCount: submissionCount,
            });
        } else {
            if (userLogin.role === 'member') {
                return res.redirect('/');
            } else if (userLogin.role === 'admin') {
                return res.redirect('/admin');
            } else if (userLogin.role === 'creator') {
                return res.redirect('/vehicles');
            } else {
                console.log('Unknown role logged in');
            }
        }
    } else {
        return res.redirect('/404')
    }
}

module.exports.doEndContract = async (req,res) => {
    const formId = req.body.formId;
    console.log(formId)
    try {
        const actions = req.body.actions
        if (actions === 'sendEmail') {
            const form = await requestedForm.findById(formId);
            const user = await User.findById(form.userId);
            const userLogin = await User.findById(req.session.login);
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'emonawong22@gmail.com',
                    pass: 'nouv heik zbln qkhf',
                },
            });
            const sendEmail = async (from, to, subject, htmlContent) => {
                try {
                    const mailOptions = {
                        from,
                        to,
                        subject,
                        html: htmlContent,
                    };
                    const info = await transporter.sendMail(mailOptions);
                    console.log('Email sent:', info.response);
                } catch (error) {
                    console.error('Error sending email:', error);
                    req.flash('message', 'Something went wrong, Please check your internet');
                    return res.status(500).render('500');
                }
            };
            const emailContent = `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h1 style="color: #000;">Hello ${user.fullname}</h1>
                    <p style="color: #000;">From: <strong>Reymond R. Godoy</strong></p>
                    <p style="color: ##FF7F7F;">This is a warning</p>
                    <p style="color: #000;">Please check your Request Form <a href="/requests" ></a></p>
                </div>
            `;
            sendEmail(
                `lguk-katipunan.onrender.com <${userLogin.email}>`,
                user.email,
                'Notification For Warning',
                emailContent
            );
            req.flash('message', 'Email Send!')
            return res.redirect('/vehicles')
        
        } else if (actions === 'endContract'){
            const requestForm = await requestedForm.findById(formId);
        console.log(requestForm)
        // Check if all selected vehicles have non-zero quantities
        const allQuantitiesNonZero = await Promise.all(requestForm.selectedVehicle.map(async (selectedVehicle) => {
            const vehicleCount = await Vehicle.countDocuments({ type: selectedVehicle.vehicleId, qty: 0, status: 'released' });
            return vehicleCount >= selectedVehicle.qty;
        }));
        // Check if all selected vehicles have non-zero quantities
        if (allQuantitiesNonZero.every(quantity => quantity)) {
            await Promise.all(requestForm.selectedVehicle.map(async (selectedVehicle) => {
                const vehiclesToUpdate = await Vehicle.find({ type: selectedVehicle.vehicleId, qty: 0, status: 'released' }).limit(selectedVehicle.qty);
                await Promise.all(vehiclesToUpdate.map(async (vehicle) => {
                    vehicle.qty = 1;
                    vehicle.status = 'available';
                    await vehicle.save();
                }));
            }));
            const currentDate = new Date();
            const dateSettled = `${currentDate.getMonth() + 1}-${currentDate.getDate()}-${currentDate.getFullYear()}`;
            await requestedForm.findByIdAndUpdate(formId, { status: 'settled', dateSettled: dateSettled });
            req.flash('message', 'Successfully End Contract!');
            return res.status(200).redirect('/vehicles');
        } else {
            req.flash('message', 'Failed to End Contract');
            return res.status(400).redirect('/vehicles');
        }
        }
    } catch (error) {
        console.error('Error approving request:', error);
        req.flash('error', 'An error occurred.');
        return res.status(500).render('500');
    }
}