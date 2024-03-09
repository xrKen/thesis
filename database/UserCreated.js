const User = require('../models/user');

const startServer = async () => {
  try {
      const usersData = [
        //creation
        { fullname: 'admin', email: 'admin@gmail.com', contact: '1234567890', address: '123 Main St', role:'admin', assign: 'Mayor', password: 'password123',},
        { fullname: 'MON MON', email: 'example1@gmail.com', contact: '1234567890', address: '123 Main St', role:'member', assign: 'Barangay Miputak', password: 'password123',},
        { fullname: 'MON1 MON', email: 'example2@gmail.com', contact: '1234567890', address: '123 Main St', role:'member', assign: 'Barangay Barra', password: 'password123',},
        { fullname: 'MON2 MON', email: 'example3@gmail.com', contact: '1234567890', address: '123 Main St', role:'member', assign: 'Barangay Biasong', password: 'password123',},
        { fullname: 'MON3 MON', email: 'example4@gmail.com', contact: '1234567890', address: '123 Main St', role:'member', assign: 'Barangay Minaog', password: 'password123',},
        { fullname: 'MON4 MON', email: 'example5@gmail.com', contact: '1234567890', address: '123 Main St', role:'member', assign: 'Barangay Turno', password: 'password123',},
        { fullname: 'MON4 MON', email: 'creator@gmail.com', contact: '1234567890', address: '123 Main St', role:'creator', assign: 'Barangay Sta. Isabel', password: 'password123',},
        { fullname: 'MON4 MON', email: 'marzvelasco73019@gmail.com', contact: '1234567890', address: '123 Main St', role:'admin', assign: 'Barangay Sta. Isabel', password: 'password123',}
      ];

      const createdUsers = [];
      for (const userData of usersData) {
        const existingUser = await User.findOne({ email: userData.email });

        if (!existingUser) {
            const newUser = new User(userData);
            const savedUser = await newUser.save();
            console.log('data created');
            createdUsers.push(savedUser);
        } else {
            console.log(`User with email ${userData.email} already exists.`);
        }
    }

  } catch (error) {
      console.error('Error starting server:', error);
  }
}

module.exports =  startServer ;