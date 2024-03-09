const fs = require('fs').promises;
const SITE_TITLE = 'Online LGU Katipunan Appointment System'
const User = require('../models/user');
const multer = require('multer');
var fileUpload = require('../middlewares/profile-upload-middleware');

module.exports.userEdit = async (req,res) => {
    const userLogin = await User.findById(req.session.login);
    try {
        if(userLogin){
                const user = await User.findById(req.session.login);
                res.render('profile_edit', {
                    site_title: SITE_TITLE,
                    title: 'Profile',
                    session: req.session,
                    user: user, 
                    currentUrl: req.originalUrl
                });
        } else{
            return res.redirect('/login');
        }
    } catch (error) {
        console.log('error:', error);
        req.flash('error', 'An error occurred.');
        return res.status(500).render('500');
    }
}

module.exports.userDoEdit = async (req, res) => {
    try {
        const userId = req.body.userId;
        console.log(req.session.login)
        const user = await User.findById(req.session.login);
        console.log(user)
        var upload = multer({
            storage: fileUpload.files.storage(),
            allowedFile: fileUpload.files.allowedFile
        }).single('image');
        upload(req, res, async function (err) {
            console.log('req.file', req.file);
            if (err instanceof multer.MulterError) {
                // Sending the multer error to the client
                return res
                    .status(err.status || 400)
                    .render('400', { err: err });
            } else if (err) { // If there's another kind of error (not a MulterError), then handle it here
                // Sending the generic error to the client
                console.log(err);
                return res
                    .status(err.status || 500)
                    .render('500', { err: err });
            } else { // If no errors occurred during the file upload, continue to the next step
                let imageUrl = ''; // Default to an empty string
                if (user.imageURL) {
                    // If user.imageURL exists, use it
                    imageUrl = user.imageURL;
                }
                if (req.file) {
                    // If a file was uploaded, construct the new image URL
                    imageUrl = `/public/img/profile/${req.session.login}/${req.file.filename}`;
                }
                const updateUser = {
                    fullname: req.body.fullname,
                    email: req.body.email,
                    contact: req.body.contact,
                    address: req.body.address,
                    assign: req.body.assign,
                    imageURL: imageUrl
                };
                const updatedUser = await User.findByIdAndUpdate(user._id, updateUser, {
                    new: true
                });
                if(updatedUser.role === 'member'){
                    if (updatedUser) {
                        console.log('user updated profile', user._id);
                        req.flash('message', 'Profile update success!')
                        return res.redirect('/');
                    } else {
                        console.log('update failed');
                    }
                } else if(updatedUser.role === 'creator') {
                    if (updatedUser) {
                        console.log('user updated profile', user._id);
                        req.flash('message', 'Profile update success!')
                        return res.redirect('/vehicles');
                    } else {
                        console.log('update failed');
                    }
                } else if(updatedUser.role === 'admin') {
                    if (updatedUser) {
                        console.log('user updated profile', user._id);
                        req.flash('message', 'Profile update success!')
                        return res.redirect('/admin');
                    } else {
                        console.log('update failed');
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error updating user:', error);
        req.flash('error', 'An error occurred.');
        return res.status(500).render('500');
    }
}
