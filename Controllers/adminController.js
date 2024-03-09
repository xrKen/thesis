const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');
const SITE_TITLE = 'Online LGU Katipunan Appointment System'
const User = require('../models/user');
const requestedForm = require('../models/request');
const Vehicle = require('../models/vehicle');
const multer = require('multer');
var fileUpload = require('../middlewares/profile-update-middleware');
var bcrypt = require("bcrypt");

module.exports.index = async (req, res) => {
    const login = req.session.login;
    const userLogin = await User.findById(login);
    try {
        if (userLogin) {
            if (userLogin.role === 'admin') {
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
                const vehicle = await Vehicle.find();
                const vehicles = await Vehicle.find();
                const reqForm = await requestedForm.find({ userId: user._id });
                const reqForms = await requestedForm.find();
                res.render('admin', {
                    site_title: SITE_TITLE,
                    title: 'Admin',
                    currentUrl: req.originalUrl,
                    users: users,
                    user: user,
                    reqForm: reqForm,
                    reqForms: reqForms,
                    messages: req.flash(),
                    vehicle: vehicle,
                    vehicles: vehicles,
                    User: User,
                    submissionCount: submissionCount,
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

            const allQuantitiesNonZero = await Promise.all(requestForm.selectedVehicle.map(async (selectedVehicle) => {
                const vehicleCount = await Vehicle.countDocuments({ type: selectedVehicle.vehicleId, qty: 0, status: 'process' });
                return vehicleCount >= selectedVehicle.qty;
            }));

            if (allQuantitiesNonZero.every(quantity => quantity)) {
                await Promise.all(requestForm.selectedVehicle.map(async (selectedVehicle) => {
                    const vehiclesToUpdate = await Vehicle.find({ type: selectedVehicle.vehicleId, qty: 0, status: 'process' }).limit(selectedVehicle.qty);
                    await Promise.all(vehiclesToUpdate.map(async (vehicle) => {
                        vehicle.status = 'released';
                        const currentDate = new Date();
                        const formattedDate = `${currentDate.getMonth() + 1}-${currentDate.getDate()}-${currentDate.getFullYear()}`;
                        vehicle.dateDeployed = formattedDate;
                        await vehicle.save();
                    }));
                }));
                const currentDate = new Date();
                const formattedDate = `${currentDate.getMonth() + 1}-${currentDate.getDate()}-${currentDate.getFullYear()}`;
                await requestedForm.findByIdAndUpdate(formId, { status: 'approved', dateApproved: formattedDate });
                req.flash('message', 'Approved');
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
                const Link = `https://lguk-online.onrender.com/requests`;
                const emailContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <p style="color: #000; font-size:18px;">This is: <strong>${user.fullname}</strong> (${user.role})</p>
                <p style="color: #000;">The request of <strong>${requestUser.assign}</strong> with the requestor name <strong>${requestForm.requestorName}</strong> has been approved.</p>
                <p>Go to <a href="${Link}" >Dashboard</a> </p>
            </div>
        `;
                sendEmail(
                    `lguk-online.onrender.com <${user.email}>`,
                    `${requestUser.email}, moras.jeyban23@gmail.com`,
                    'Request Form',
                    emailContent,
                    outputPath
                );
                return res.status(200).redirect('/admin');
            } else {
                req.flash('message', 'Cannot approve form. Some selected vehicles have been deleted.');
                return res.status(400).redirect('/admin');
            }
        } catch (error) {
            console.error('Error approving request:', error);
        }
    } else if (actions === 'decline') {

        console.log('decline');
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
                        <p style="color: #000;">The request of <strong>${requestForm.requestorName}</strong> has been declined.</p>
                        <p>Go to <a href="${Link}" >Dashboard</a> </p>
                    </div>
                `;
                    sendEmail(
                        `lguk-online.onrender.com <${user.email}>`,
                        //sending message in two emails
                        `${requestUser.email}, creator@gmail.com`,
                        'Request Form',
                        emailContent,
                        outputPath
                    );

                }
                await requestedForm.findByIdAndUpdate(formId, { status: 'declined' });
                req.flash('message', 'Request Declined Successfully!');
                return res.status(200).redirect('/admin');
            } else {
                req.flash('message', 's');
                return res.status(400).redirect('/vehicles');
            }
        } catch (error) {
            console.error('Error approving request:', error);
        }
    } else {
        console.log('Default logic goes here');
    }
}
module.exports.dashboard = async (req, res) => {
    const login = req.session.login;
    const userLogin = await User.findById(login);
    try {
        if (userLogin) {
            if (userLogin.role === 'admin') {
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
                res.render('dashboard', {
                    site_title: SITE_TITLE,
                    title: 'Dashboard',
                    currentUrl: req.originalUrl,
                    users: users,
                    user: user,
                    reqForm: reqForm,
                    reqForms: reqForms,
                    messages: req.flash(),
                    vehicle: vehicle,
                    vehicles: vehicles,
                    submissionCount: submissionCount
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
        return res.status(500).render('500');
    }
}

module.exports.userEdit = async (req, res) => {
    const userLogin = await User.findById(req.session.login);
    try {
        if (userLogin) {
            if (userLogin.role === 'admin') {
                const userId = req.params.id;
                console.log(userId)
                const userData = await User.findById(userId);
                const user = await User.findById(req.session.login);
                res.render('user_edit', {
                    site_title: SITE_TITLE,
                    title: 'Profile',
                    session: req.session,
                    userData: userData,
                    user: user,
                    currentUrl: req.originalUrl
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
            return res.redirect('/login');
        }
    } catch (error) {
        console.log('error:', error)
        req.flash('error', 'An error occurred.');
        return res.status(500).render('500');
    }
}


module.exports.userDoEdit = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);

        // Multer upload
        var upload = multer({
            storage: fileUpload.files.storage(),
            allowedFile: fileUpload.files.allowedFile
        }).single('image');

        upload(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                return res.status(err.status || 400).render('400', { err: err });
            } else if (err) {
                console.log(err);
                return res.status(err.status || 500).render('500', { err: err });
            } else {
                let imageUrl = '';
                if (user.imageURL) {
                    imageUrl = user.imageURL;
                }
                if (req.file) {
                    imageUrl = `/public/img/profile/${userId}/${req.file.filename}`;
                }

                const emailInputed = req.body.email;
                const emailExist = await User.findOne({ email: req.body.email });

                const password = req.body.password;
                const confirmPassword = req.body.confirmPassword;

                if (password !== confirmPassword) {
                    req.flash('message', 'Password does not match.');
                    return res.redirect(`/user/${user._id}`);
                }

                if (emailInputed === user.email) {
                    const hashedPassword = await bcrypt.hash(password, 10);

                    const updateUser = {
                        fullname: req.body.fullname,
                        email: req.body.email,
                        contact: req.body.contact,
                        address: req.body.address,
                        assign: req.body.assign,
                        role: req.body.role,
                        imageURL: imageUrl,
                        password: hashedPassword
                    };

                    const updatedUser = await User.findByIdAndUpdate(user._id, updateUser, { new: true });

                    if (updatedUser) {
                        console.log('User updated profile', user._id);
                        req.flash('message', 'User Updated!');
                        return res.redirect('/dashboard');
                    } else {
                        console.log('Update failed');
                    }
                } else {
                    if (emailExist) {
                        req.flash('message', 'Email is already used. Please provide another email.');
                        return res.redirect(`/user/${user._id}`);
                    }
                    const hashedPassword = await bcrypt.hash(password, 10);

                    const updateUser = {
                        fullname: req.body.fullname,
                        email: req.body.email,
                        contact: req.body.contact,
                        address: req.body.address,
                        assign: req.body.assign,
                        role: req.body.role,
                        imageURL: imageUrl,
                        password: hashedPassword
                    };

                    const updatedUser = await User.findByIdAndUpdate(user._id, updateUser, { new: true });

                    if (updatedUser) {
                        console.log('User updated profile', user._id);
                        req.flash('message', 'User Updated!');
                        return res.redirect('/dashboard');
                    } else {
                        console.log('Update failed');
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('message', 'An error occurred. Please try again.');
        return res.redirect('/edit');
    }
};


module.exports.userDel = async (req, res) => {
    const userId = req.body.userId;
    try {
        const deletedUser = await User.findByIdAndDelete(userId);
        if (deletedUser) {
            req.flash('message', 'User has been deleted successfully!');
            return res.redirect('/dashboard');
        } else {
            req.flash('message', 'User not found or already deleted.');
            return res.redirect('/dashboard');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        req.flash('error', 'An error occurred.');
        return res.status(500).render('500');
    }
}

module.exports.userAdd = async (req, res) => {
    const userId = req.session.login;
    const user = await User.findById(userId)
    try {
        if (user) {
            if (user.role === 'admin') {
                res.render('user_add', {
                    site_title: SITE_TITLE,
                    title: 'Creation',
                    user: user,
                    session: req.session,
                    currentUrl: req.originalUrl
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
            return res.redirect('/');
        }
    } catch (err) {
        console.log('err', err)
        req.flash('error', 'An error occurred.');
        return res.status(500).render('500');
    }
}

module.exports.userDoAdd = async (req, res) => {
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;

    if (password !== confirmPassword) {
        req.flash('message', 'Password does not match.');
        return res.redirect(`/dashboard/user/create`);
    }
    const user = new User({
        fullname: req.body.fullname,
        email: req.body.email,
        address: req.body.address,
        role: req.body.role,
        contact: req.body.contact,
        assign: req.body.assign,
        password: req.body.password,
    })
    user.save().then(() => {
        console.log('success')
        req.flash('message', 'User Create Successfully!')
        return res.redirect('/dashboard');
    }, () => {
        console.log('failed')
        req.flash('message', 'Failed to Create User!')
        return res.redirect('/dashboard/user/create');
    });
}