# Voice of Her - Women Empowerment Platform

A comprehensive web application designed to empower women by providing essential resources, support systems, and emergency assistance through SOS alerts.

## Features

### 🔐 User Authentication
- Secure user registration and login using Aadhar number
- JWT-based authentication system
- Password hashing with bcrypt
- User profile management

### 🚨 SOS Emergency System
- One-click SOS alert with GPS location
- Automatic notification to emergency contacts
- Real-time alert tracking and status updates
- Emergency contact management

### 👥 Emergency Contacts
- Add, edit, and delete emergency contacts
- Contact relationship tracking
- Quick access to emergency numbers

### 📱 User Profile Management
- Update personal information
- Manage emergency contacts
- View SOS alert history

## Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **helmet** - Security middleware
- **cors** - Cross-origin resource sharing

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling with modern gradients and animations
- **JavaScript (ES6+)** - Client-side functionality
- **Fetch API** - HTTP requests

## Project Structure

```
voiceofher/
├── server.js                 # Main server file
├── package.json             # Dependencies and scripts
├── .env                     # Environment variables (create this)
├── models/                  # Database models
│   ├── User.js             # User model
│   └── SOSAlert.js         # SOS Alert model
├── routes/                  # API routes
│   ├── auth.js             # Authentication routes
│   ├── sos.js              # SOS alert routes
│   └── users.js            # User management routes
├── middleware/              # Custom middleware
│   └── auth.js             # Authentication middleware
├── fire.js                  # Frontend API client
├── index (1).html          # Main landing page
├── login.html              # Login page
├── Register.html           # Registration page
├── sos.html                # SOS emergency page
├── profile.html            # User profile page
├── style.css               # Global styles
└── README.md               # This file
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd voiceofher
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Set Up Environment Variables
Create a `.env` file in the root directory:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/voice-of-her

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
PORT=3000
NODE_ENV=development
```

### Step 4: Start MongoDB
Make sure MongoDB is running on your system:

```bash
# On Windows
net start MongoDB

# On macOS/Linux
sudo systemctl start mongod
```

### Step 5: Start the Backend Server
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The backend server will start on `http://localhost:3000`

### Step 6: Serve the Frontend
You can serve the frontend files using any static file server:

```bash
# Using Python 3
python -m http.server 5500

# Using Node.js (install http-server globally)
npx http-server -p 5500

# Using Live Server extension in VS Code
# Right-click on index (1).html and select "Open with Live Server"
```

The frontend will be available at `http://localhost:5500`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### SOS Alerts
- `POST /api/sos/create` - Create SOS alert
- `GET /api/sos/active` - Get active alerts
- `GET /api/sos/my-alerts` - Get user's alerts
- `GET /api/sos/:alertId` - Get specific alert
- `PUT /api/sos/:alertId/status` - Update alert status
- `POST /api/sos/:alertId/notify-contacts` - Notify emergency contacts

### User Management
- `GET /api/users/` - Get all users (limited info)
- `GET /api/users/:userId` - Get specific user
- `GET /api/users/emergency-contacts` - Get user's emergency contacts
- `POST /api/users/emergency-contacts` - Add emergency contact
- `PUT /api/users/emergency-contacts/:contactId` - Update emergency contact
- `DELETE /api/users/emergency-contacts/:contactId` - Delete emergency contact

## Usage Guide

### 1. User Registration
1. Navigate to the registration page
2. Enter your Aadhar number (12 digits)
3. Create a strong password (minimum 6 characters)
4. Provide your phone number (Indian format)
5. Optionally add your name and email
6. Click "Register"

### 2. User Login
1. Go to the login page
2. Enter your Aadhar number and password
3. Click "Login"
4. You'll be redirected to the main page

### 3. Setting Up Emergency Contacts
1. Click on "Profile" or navigate to the profile page
2. In the "Emergency Contacts" section, click "Add Emergency Contact"
3. Fill in the contact's name, phone number, and relationship
4. Click "Add Contact"
5. Repeat for additional contacts

### 4. Using SOS Alert
1. Navigate to the SOS page
2. Ensure location access is granted
3. Click the large SOS button
4. The system will:
   - Get your current location
   - Create an SOS alert
   - Notify your emergency contacts
   - Display success confirmation

### 5. Managing Profile
1. Go to the profile page
2. Update your personal information
3. Manage your emergency contacts
4. View your SOS alert history

## Security Features

- **Password Hashing**: All passwords are hashed using bcrypt
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Server-side validation for all inputs
- **Rate Limiting**: Protection against brute force attacks
- **CORS Protection**: Controlled cross-origin requests
- **Helmet Security**: Additional security headers

## Database Schema

### User Model
```javascript
{
  aadhar: String (12 digits, unique),
  password: String (hashed),
  phone: String (Indian format),
  name: String,
  email: String,
  emergencyContacts: [{
    name: String,
    phone: String,
    relationship: String
  }],
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### SOS Alert Model
```javascript
{
  userId: ObjectId (ref: User),
  userAadhar: String,
  userName: String,
  userPhone: String,
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  description: String,
  status: String (active/resolved/false_alarm),
  priority: String (low/medium/high/critical),
  emergencyType: String (harassment/assault/medical/accident/other),
  notifiedContacts: [{
    name: String,
    phone: String,
    notifiedAt: Date,
    response: String
  }],
  policeNotified: Boolean,
  policeResponse: {
    notifiedAt: Date,
    responseTime: Number,
    status: String
  },
  resolvedAt: Date,
  resolvedBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Future Enhancements

- [ ] SMS/Email notification integration
- [ ] Police department integration
- [ ] Real-time chat support
- [ ] Mobile app development
- [ ] AI-powered threat detection
- [ ] Community support features
- [ ] Educational resources
- [ ] Anonymous reporting system

## Support

For support and questions, please contact:
- Email: majjineeraja8121@gmail.com
- Phone: +91-8977462100

## License

This project is licensed under the MIT License.

## Acknowledgments

- Voice of Her team for the vision and concept
- Open source community for the tools and libraries
- Women's safety advocates and organizations

---

**Note**: This is a development version. For production deployment, ensure proper security measures, SSL certificates, and environment-specific configurations. 