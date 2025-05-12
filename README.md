# Election Portal Backend API

This repository contains the backend API for the university election portal system. The API provides endpoints for user authentication, election management, grievance handling, and voting.

## Features

- Multi-role authentication (Admin, House, Society, User)
- Access control based on user roles
- Election management for university, houses, and societies
- Candidate nomination and approval
- Voting system
- Grievance submission and resolution
- Results calculation and display

## Setting Up the Project

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- NPM or Yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd election-portal-backend
```

2. Install dependencies
```bash
npm install
```

3. Create environment variables
```bash
cp .env.example .env
```

4. Edit the `.env` file with your configuration

5. Start the development server
```bash
npm run dev
```

## Security Implementation

The backend implements several security measures:

1. **JWT-based Authentication**
   - Secure tokens for session management
   - Token refresh mechanism
   - Automatic token expiration

2. **Role-Based Access Control**
   - Different permission levels (Admin, House, Society, User)
   - Resource-specific authorization checks

3. **Data Protection**
   - Password hashing with bcrypt
   - Sensitive data hiding in API responses

4. **Request Validation**
   - Input validation for all endpoints
   - Prevention of common attacks (injection, XSS)

5. **Rate Limiting**
   - Protection against brute force attacks
   - API abuse prevention

6. **Secure HTTP Headers**
   - Helmet.js implementation for security headers
   - CORS configuration

## API Endpoints

### Authentication

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/signup` | Register a new user | Public |
| POST | `/api/auth/login` | Log in a user | Public |
| POST | `/api/auth/refresh-token` | Refresh access token | Public |
| PATCH | `/api/auth/update-password` | Update user password | Authenticated |

### Users

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/users/me` | Get current user profile | Authenticated |
| PATCH | `/api/users/me` | Update current user profile | Authenticated |
| GET | `/api/users` | Get all users | Admin |
| GET | `/api/users/:id` | Get specific user | Admin |
| PATCH | `/api/users/:id` | Update user | Admin |
| DELETE | `/api/users/:id` | Delete user | Admin |

### Elections

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/elections` | Get all elections | Authenticated |
| GET | `/api/elections/:id` | Get election details | Authenticated |
| POST | `/api/elections` | Create a new election | Admin, House, Society |
| PATCH | `/api/elections/:id` | Update an election | Admin, Election Creator |
| DELETE | `/api/elections/:id` | Delete an election | Admin, Election Creator |
| POST | `/api/elections/:id/position` | Add a position to election | Admin, Election Creator |
| POST | `/api/elections/:id/nominate` | Submit a nomination | Authenticated |
| PATCH | `/api/elections/:id/approve-nomination` | Approve a nomination | Admin, House, Society |

### Houses

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/houses` | Get all houses | Authenticated |
| GET | `/api/houses/:id` | Get house details | Authenticated |
| POST | `/api/houses` | Create a new house | Admin |
| PATCH | `/api/houses/:id` | Update house | Admin |
| DELETE | `/api/houses/:id` | Delete house | Admin |
| POST | `/api/houses/:id/members` | Add members to house | Admin |
| DELETE | `/api/houses/:id/members/:userId` | Remove member from house | Admin |

### Societies

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/societies` | Get all societies | Authenticated |
| GET | `/api/societies/:id` | Get society details | Authenticated |
| POST | `/api/societies` | Create a new society | Admin |
| PATCH | `/api/societies/:id` | Update society | Admin, Society Lead |
| DELETE | `/api/societies/:id` | Delete society | Admin |
| POST | `/api/societies/:id/members` | Add members to society | Admin, Society Lead |
| DELETE | `/api/societies/:id/members/:userId` | Remove member from society | Admin, Society Lead |

### Grievances

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/grievances` | Get all grievances | Admin |
| GET | `/api/grievances/my` | Get user's grievances | Authenticated |
| GET | `/api/grievances/:id` | Get grievance details | Admin, Grievance Creator |
| POST | `/api/grievances` | Submit a grievance | Authenticated |
| PATCH | `/api/grievances/:id` | Update grievance status | Admin |
| POST | `/api/grievances/:id/resolve` | Resolve a grievance | Admin |

### Votes

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/votes/:electionId` | Cast a vote | Authenticated |
| GET | `/api/votes/my` | Get user's voting history | Authenticated |

### Results

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/results/:electionId` | Get election results | Authenticated |

## Making Secure API Calls from Frontend

### Example: Authentication

```javascript
// Login request
const login = async (email, password) => {
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.status === 'success') {
      // Store tokens securely
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      return data.data.user;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};
```

### Example: Making Authenticated Requests

```javascript
// Function to make authenticated API requests
const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  
  // Set authorization header
  const authOptions = {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  
  try {
    const response = await fetch(url, authOptions);
    
    // Handle 401 Unauthorized (token expired)
    if (response.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry with new token
        return authFetch(url, options);
      } else {
        // Redirect to login if refresh failed
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
      }
    }
    
    return response;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

// Function to refresh access token
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!refreshToken) return false;
  
  try {
    const response = await fetch('http://localhost:3000/api/auth/refresh-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });
    
    const data = await response.json();
    
    if (data.status === 'success') {
      localStorage.setItem('token', data.token);
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    return false;
  }
};
```

### Example: Fetching Election Data

```javascript
// Get all elections
const getElections = async () => {
  try {
    const response = await authFetch('http://localhost:3000/api/elections');
    const data = await response.json();
    
    if (data.status === 'success') {
      return data.data.elections;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error fetching elections:', error);
    throw error;
  }
};

// Get specific election details
const getElectionDetails = async (electionId) => {
  try {
    const response = await authFetch(`http://localhost:3000/api/elections/${electionId}`);
    const data = await response.json();
    
    if (data.status === 'success') {
      return data.data.election;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error fetching election details:', error);
    throw error;
  }
};
```

### Example: Submitting a Vote

```javascript
// Cast a vote in an election
const castVote = async (electionId, positionTitle, candidateId) => {
  try {
    const response = await authFetch(`http://localhost:3000/api/votes/${electionId}`, {
      method: 'POST',
      body: JSON.stringify({
        position: positionTitle,
        candidate: candidateId
      })
    });
    
    const data = await response.json();
    
    if (data.status === 'success') {
      return true;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error casting vote:', error);
    throw error;
  }
};
```

## Best Practices for Security

1. **Never store the JWT token in cookies or localStorage** in a production environment. Consider using HttpOnly cookies or a more secure storage mechanism.

2. **Implement proper CSRF protection** for cookie-based authentication.

3. **Validate all user inputs** on both client and server sides.

4. **Use HTTPS** for all API communications in production.

5. **Implement proper error handling** without exposing sensitive information.

6. **Set appropriate CORS policies** in production to restrict access to trusted domains.

7. **Regularly rotate and refresh tokens** to reduce the impact of token theft.

8. **Implement two-factor authentication** for sensitive operations like changing password or voting.

## License

[Your License Here]
