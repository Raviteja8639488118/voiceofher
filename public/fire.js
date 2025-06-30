// Backend API configuration
// Auto-detect backend base URL
const API_BASE_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3000/api"
  : "https://voiceofher.onrender.com/api";


// Utility functions
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

function setCookie(name, value, days = 7) {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function removeCookie(name) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

// API request helper
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('authToken');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Authentication functions
export async function registerUser(aadhar, password, phone, name = '', email = '') {
  try {
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        aadhar,
        password,
        phone,
        name,
        email
      })
    });

    // Store token and user info
    localStorage.setItem('authToken', response.token);
    localStorage.setItem('userId', response.user._id);
    setCookie('userId', response.user._id);

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

export async function loginUser(aadhar, password) {
  try {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        aadhar,
        password
      })
    });

    // Store token and user info
    localStorage.setItem('authToken', response.token);
    localStorage.setItem('userId', response.user._id);
    setCookie('userId', response.user._id);

    return response;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userId');
  removeCookie('userId');
  window.location.href = 'login.html';
}

export function isLoggedIn() {
  return localStorage.getItem('authToken') !== null;
}

export function getCurrentUser() {
  const userId = localStorage.getItem('userId');
  return userId ? { id: userId } : null;
}

// SOS Alert functions
export async function createSOSAlert(latitude, longitude, address = '', description = '', emergencyType = 'other') {
  try {
    const response = await apiRequest('/sos/create', {
      method: 'POST',
      body: JSON.stringify({
        latitude,
        longitude,
        address,
        description,
        emergencyType
      })
    });

    return response;
  } catch (error) {
    console.error('SOS creation error:', error);
    throw error;
  }
}

export async function getActiveAlerts() {
  try {
    const response = await apiRequest('/sos/active');
    return response.alerts;
  } catch (error) {
    console.error('Get active alerts error:', error);
    throw error;
  }
}

export async function getUserAlerts() {
  try {
    const response = await apiRequest('/sos/my-alerts');
    return response.alerts;
  } catch (error) {
    console.error('Get user alerts error:', error);
    throw error;
  }
}

export async function updateAlertStatus(alertId, status) {
  try {
    const response = await apiRequest(`/sos/${alertId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });

    return response;
  } catch (error) {
    console.error('Update alert status error:', error);
    throw error;
  }
}

// User profile functions
export async function getUserProfile() {
  try {
    const response = await apiRequest('/auth/profile');
    return response.user;
  } catch (error) {
    console.error('Get profile error:', error);
    throw error;
  }
}

export async function updateUserProfile(profileData) {
  try {
    const response = await apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });

    return response;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
}

export async function addEmergencyContact(name, phone, relationship = '') {
  try {
    const response = await apiRequest('/users/emergency-contacts', {
      method: 'POST',
      body: JSON.stringify({
        name,
        phone,
        relationship
      })
    });

    return response;
  } catch (error) {
    console.error('Add emergency contact error:', error);
    throw error;
  }
}

export async function getEmergencyContacts() {
  try {
    const response = await apiRequest('/users/emergency-contacts');
    return response.contacts;
  } catch (error) {
    console.error('Get emergency contacts error:', error);
    throw error;
  }
}

export async function deleteEmergencyContact(contactId) {
  try {
    const response = await apiRequest(`/users/emergency-contacts/${contactId}`, {
      method: 'DELETE'
    });

    return response;
  } catch (error) {
    console.error('Delete emergency contact error:', error);
    throw error;
  }
}

// Phone number functions (for backward compatibility)
export function getPhoneNumbers() {
  // This function is used in the existing SOS page
  // For now, return emergency contacts from localStorage or make API call
  const contacts = localStorage.getItem('emergencyContacts');
  if (contacts) {
    return JSON.parse(contacts).map(contact => contact.phone).join('|');
  }
  return null;
}

export async function getAllUsersNumbers(userId) {
  try {
    // Get current user's emergency contacts
    const contacts = await getEmergencyContacts();
    const phoneNumbers = contacts.map(contact => contact.phone).join('|');
    localStorage.setItem('emergencyContacts', JSON.stringify(contacts));
    return phoneNumbers;
  } catch (error) {
    console.error('Get all users numbers error:', error);
    return null;
  }
}

// Location functions
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  });
}

// SOS Alert helper function
export async function sendSOSAlert(description = '', emergencyType = 'other') {
  try {
    // Get current location
    const location = await getCurrentLocation();
    
    // Create SOS alert
    const response = await createSOSAlert(
      location.latitude,
      location.longitude,
      '',
      description,
      emergencyType
    );

    // Notify emergency contacts
    if (response.alert) {
      await apiRequest(`/sos/${response.alert.id}/notify-contacts`, {
        method: 'POST'
      });
    }

    return response;
  } catch (error) {
    console.error('Send SOS alert error:', error);
    throw error;
  }
}

// Initialize app
export function initializeApp() {
  // Check if user is logged in
  if (!isLoggedIn()) {
    // Redirect to login if not on login or register page
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage !== 'login.html' && currentPage !== 'Register.html' && currentPage !== 'index (1).html') {
      window.location.href = 'login.html';
    }
  }

  // Add logout functionality to protected pages
  const logoutButtons = document.querySelectorAll('.logout-btn');
  logoutButtons.forEach(button => {
    button.addEventListener('click', logout);
  });

  // Add SOS button functionality
  const sosButtons = document.querySelectorAll('.sos-btn');
  sosButtons.forEach(button => {
    button.addEventListener('click', async () => {
      try {
        await sendSOSAlert();
        alert('SOS alert sent successfully! Emergency contacts have been notified.');
      } catch (error) {
        alert('Failed to send SOS alert. Please try again.');
        console.error('SOS button error:', error);
      }
    });
  });
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp); 