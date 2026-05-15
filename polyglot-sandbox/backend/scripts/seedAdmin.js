const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://mongo:27017/polyglot');
        
        const adminEmail = 'admin@polyglot.com';
        const adminExists = await User.findOne({ email: adminEmail });
        
        if (adminExists) {
            console.log('Admin user already exists.');
        } else {
            await User.create({
                name: 'System Admin',
                email: adminEmail,
                password: 'adminpassword123', // You can change this
                role: 'admin'
            });
            console.log('Admin user created successfully!');
            console.log('Email: admin@polyglot.com');
            console.log('Password: adminpassword123');
        }
        
        process.exit();
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
