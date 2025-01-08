// Importing necessary libraries and modules
const express = require('express');
const mongoose = require('mongoose');  // MongoDB ODM
const session = require('express-session');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const path = require('path');
const uuid = require('uuid');
const Customers = require('./customer');

const app = express();
const port = 3000;
const saltRounds = 5;

// 🔹 MongoDB Connection with Error Handling
const uri = "mongodb://127.0.0.1:27017/customerDB";
mongoose.connect(uri, { dbName: 'customerDB' })
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// 🔹 Session Configuration
app.use(session({
    secret: 'itsmysecret',
    resave: false,
    saveUninitialized: true,
    genid: () => uuid.v4(),
    cookie: { maxAge: 120000 }  // Session expires after 2 minutes
}));

// Middleware
app.use(express.json());  // Use built-in JSON parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, 'frontend')));

// 🔹 User Login Route
app.post('/api/login', async (req, res) => {
    try {
        const { user_name, password } = req.body;

        if (!user_name || !password) return res.status(400).send("Missing username or password");

        const user = await Customers.findOne({ user_name });

        if (!user) return res.status(401).send("User Information incorrect");

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).send("Password Incorrect! Try again");

        req.session.username = user_name;
        res.cookie('username', user_name);
        res.sendFile(path.join(__dirname, 'frontend', 'home.html'));

    } catch (error) {
        console.error("❌ Error during login:", error);
        res.status(500).send("Server error");
    }
});

// 🔹 Register New Customer Route
app.post('/api/add_customer', async (req, res) => {
    try {
        const { user_name, age, password, email } = req.body;

        if (!user_name || !age || !password || !email) return res.status(400).send("All fields are required");

        const existingUser = await Customers.findOne({ user_name });
        if (existingUser) return res.send("User already exists");

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newCustomer = new Customers({
            user_name,
            age,
            password: hashedPassword,
            email
        });

        await newCustomer.save();
        res.send("Customer added successfully");

    } catch (error) {
        console.error("❌ Error adding customer:", error);
        res.status(500).send("Server error");
    }
});

// 🔹 Serve Home Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'home.html'));
});

// 🔹 Logout Route
app.get('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) console.error(err);
        res.cookie('username', '', { expires: new Date(0) });
        res.redirect('/');
    });
});

// 🔹 Start Server
app.listen(port, () => {
    console.log(`🚀 Server is running at http://localhost:${port}`);
});
