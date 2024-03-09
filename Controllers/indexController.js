const SITE_TITLE = 'Online LGU Katipunan Appointment System';
const User = require('../models/user');
const requestedForm = require('../models/request');
const Vehicle = require('../models/vehicle');

module.exports.index = async (req, res) => {
    const login = req.session.login;
    const userLogin = await User.findById(login);
    try {
        if (userLogin) {
            if (userLogin.role === 'member') {
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
                const reqForms = await requestedForm.find({ userId: user._id });
                const reqForm = await requestedForm.find();
                const vehicle = await Vehicle.find();
                const vehicles = await Vehicle.find();
                res.render('index', {
                    site_title: SITE_TITLE,
                    title: 'Home',
                    currentUrl: req.originalUrl,
                    users: users,
                    user: user,
                    reqForm: reqForm,
                    reqForms: reqForms,
                    messages: req.flash(),
                    vehicle: vehicle,
                    vehicles: vehicles,
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
module.exports.requests = async (req, res) => {
    const login = req.session.login;
    const userLogin = await User.findById(login);
    try {
        if (userLogin) {
            if (userLogin.role === 'member') {
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
                const reqForms = await requestedForm.find({ userId: user._id });
                const reqForm = await requestedForm.find();

                res.render('request_status', {
                    site_title: SITE_TITLE,
                    title: 'Requests',
                    currentUrl: req.originalUrl,
                    users: users,
                    user: user,
                    reqForm: reqForm,
                    reqForms: reqForms,
                    messages: req.flash(),
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