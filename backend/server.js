const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'etoh_tracker',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected successfully');
    release();
  }
});

// File upload configuration
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and GIF allowed.'));
    }
  }
});

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'ETOH Tracker API is running' });
});


// Auth endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('Registration attempt with body:', req.body);
    const { email, password, full_name, gender } = req.body;

    if (!email || !password) {
      console.log('Missing email or password:', { email: !!email, password: !!password });
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate gender if provided
    if (gender && !['male', 'female', 'other', 'prefer_not_to_say'].includes(gender)) {
      return res.status(400).json({ error: 'Invalid gender value' });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, gender) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, gender',
      [email, password_hash, full_name, gender]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const result = await pool.query(
      'SELECT id, email, password_hash, full_name FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, profile_picture_url, motivation_text, gender FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Friends endpoints
app.get('/api/friends', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.id, f.friend_id, f.created_at,
             u.id as friend_id, u.email, u.full_name, u.profile_picture_url
      FROM friendships f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC
    `, [req.user.userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/friend-requests', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT fr.id, fr.sender_id, fr.status, fr.created_at,
             u.email, u.full_name, u.profile_picture_url
      FROM friend_requests fr
      JOIN users u ON fr.sender_id = u.id
      WHERE fr.receiver_id = $1 AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `, [req.user.userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/friend-request', authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find target user
    const targetResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (targetResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUserId = targetResult.rows[0].id;

    // Check if already friends
    const friendshipResult = await pool.query(
      'SELECT id FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
      [req.user.userId, targetUserId]
    );

    if (friendshipResult.rows.length > 0) {
      return res.status(400).json({ error: 'Already friends' });
    }

    // Check if request already exists
    const existingRequest = await pool.query(
      'SELECT id FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2',
      [req.user.userId, targetUserId]
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }

    // Create friend request
    const result = await pool.query(
      'INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES ($1, $2, $3) RETURNING id',
      [req.user.userId, targetUserId, 'pending']
    );

    res.json({ message: 'Friend request sent successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/friend-request/:id/accept', authenticateToken, async (req, res) => {
  try {
    const requestId = req.params.id;

    // Get friend request
    const requestResult = await pool.query(
      'SELECT sender_id, receiver_id FROM friend_requests WHERE id = $1 AND receiver_id = $2',
      [requestId, req.user.userId]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    const { sender_id, receiver_id } = requestResult.rows[0];

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update request status
      await client.query(
        'UPDATE friend_requests SET status = $1 WHERE id = $2',
        ['accepted', requestId]
      );

      // Create friendship (both directions)
      await client.query(
        'INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2), ($2, $1)',
        [sender_id, receiver_id]
      );

      await client.query('COMMIT');
      res.json({ message: 'Friend request accepted' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Drink entries endpoints
app.get('/api/drinks', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = 'SELECT * FROM drink_entries WHERE user_id = $1';
    let params = [req.user.userId];
    
    if (startDate) {
      query += ' AND logged_at >= $2';
      params.push(startDate);
    }
    
    if (endDate) {
      const paramIndex = params.length + 1;
      query += ` AND logged_at <= $${paramIndex}`;
      params.push(endDate + 'T23:59:59');
    }
    
    query += ' ORDER BY logged_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get drinks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/drinks', authenticateToken, async (req, res) => {
  try {
    const { drink_count, drink_type, notes, logged_at } = req.body;

    if (!drink_count || drink_count <= 0) {
      return res.status(400).json({ error: 'Valid drink count is required' });
    }

    let query, params;
    if (logged_at) {
      query = 'INSERT INTO drink_entries (user_id, drink_count, drink_type, notes, logged_at) VALUES ($1, $2, $3, $4, $5) RETURNING *';
      params = [req.user.userId, drink_count, drink_type, notes, logged_at];
    } else {
      query = 'INSERT INTO drink_entries (user_id, drink_count, drink_type, notes) VALUES ($1, $2, $3, $4) RETURNING *';
      params = [req.user.userId, drink_count, drink_type, notes];
    }

    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Add drink error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update drink entry
app.put('/api/drinks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { drink_count, logged_at } = req.body;

    if (!drink_count || drink_count <= 0) {
      return res.status(400).json({ error: 'Valid drink count is required' });
    }

    let query = 'UPDATE drink_entries SET drink_count = $1';
    let params = [drink_count];
    
    if (logged_at) {
      query += ', logged_at = $2';
      params.push(logged_at);
    }
    
    query += ` WHERE id = $${params.length + 1} AND user_id = $${params.length + 2} RETURNING *`;
    params.push(id, req.user.userId);

    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Drink entry not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update drink error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete drink entry
app.delete('/api/drinks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM drink_entries WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Drink entry not found' });
    }

    res.json({ message: 'Drink entry deleted successfully' });
  } catch (error) {
    console.error('Delete drink error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get drinks for specific date
app.get('/api/drinks/date/:date', authenticateToken, async (req, res) => {
  try {
    const { date } = req.params;
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const result = await pool.query(
      'SELECT * FROM drink_entries WHERE user_id = $1 AND logged_at >= $2 AND logged_at <= $3 ORDER BY logged_at DESC',
      [req.user.userId, startOfDay, endOfDay]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get drinks for date error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get average drinks per day
app.get('/api/drinks/average', authenticateToken, async (req, res) => {
  try {
    // Get user's profile to find creation/reset date
    const profileResult = await pool.query(
      'SELECT created_at, reset_date FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const profile = profileResult.rows[0];
    const resetDate = profile.reset_date ? new Date(profile.reset_date) : new Date(profile.created_at);
    const startDate = resetDate.toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    // Calculate days since reset/joining
    const daysSinceJoined = Math.ceil((Date.now() - resetDate.getTime()) / (24 * 60 * 60 * 1000));

    // Get all drink entries since reset
    const entriesResult = await pool.query(
      'SELECT drink_count, logged_at FROM drink_entries WHERE user_id = $1 AND logged_at >= $2 AND logged_at <= $3',
      [req.user.userId, startDate, endDate + 'T23:59:59']
    );

    if (entriesResult.rows.length === 0) {
      return res.json({ average: 0, daysSinceJoined });
    }

    // Group by date and sum drinks per day
    const dailyTotals = {};
    entriesResult.rows.forEach(entry => {
      const date = entry.logged_at.toISOString().split('T')[0];
      dailyTotals[date] = (dailyTotals[date] || 0) + entry.drink_count;
    });

    // Calculate average including days with 0 drinks since reset
    const totalDrinks = Object.values(dailyTotals).reduce((sum, drinks) => sum + drinks, 0);
    const average = Math.round((totalDrinks / daysSinceJoined) * 10) / 10;

    res.json({ average, daysSinceJoined });
  } catch (error) {
    console.error('Get average drinks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Goal endpoints
app.get('/api/goals/current', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_goals WHERE user_id = $1 AND is_active = true AND goal_type = $2 ORDER BY created_at DESC LIMIT 1',
      [req.user.userId, 'daily']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active goal found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get current goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/goals/daily', authenticateToken, async (req, res) => {
  try {
    const { target_drinks } = req.body;

    if (!target_drinks || target_drinks < 0) {
      return res.status(400).json({ error: 'Valid target drinks count is required' });
    }

    // Deactivate any existing daily goals
    await pool.query(
      'UPDATE user_goals SET is_active = false WHERE user_id = $1 AND goal_type = $2',
      [req.user.userId, 'daily']
    );

    // Create new daily goal
    const result = await pool.query(
      'INSERT INTO user_goals (user_id, goal_type, target_drinks, start_date, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.userId, 'daily', target_drinks, new Date().toISOString().split('T')[0], true]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Set daily goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/goals/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { target_drinks } = req.body;

    if (!target_drinks || target_drinks < 0) {
      return res.status(400).json({ error: 'Valid target drinks count is required' });
    }

    const result = await pool.query(
      'UPDATE user_goals SET target_drinks = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [target_drinks, id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/goals/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM user_goals WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Friends endpoints (matching frontend expectations)
app.post('/api/send-friend-request', authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const receiverId = userResult.rows[0].id;

    if (receiverId === req.user.userId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    // Check if already friends
    const friendshipResult = await pool.query(
      'SELECT id FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
      [req.user.userId, receiverId]
    );

    if (friendshipResult.rows.length > 0) {
      return res.status(400).json({ error: 'Already friends' });
    }

    // Check if request already exists
    const existingRequest = await pool.query(
      'SELECT id FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2 AND status = $3',
      [req.user.userId, receiverId, 'pending']
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }

    // Create friend request
    await pool.query(
      'INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES ($1, $2, $3)',
      [req.user.userId, receiverId, 'pending']
    );

    res.json({ message: 'Friend request sent successfully' });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/get-friend-requests', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT fr.id, fr.sender_id, fr.receiver_id, fr.status, fr.created_at,
              sender.email as sender_email, sender.full_name as sender_name, sender.profile_picture_url as sender_picture,
              receiver.email as receiver_email, receiver.full_name as receiver_name, receiver.profile_picture_url as receiver_picture
       FROM friend_requests fr
       JOIN users sender ON fr.sender_id = sender.id
       JOIN users receiver ON fr.receiver_id = receiver.id
       WHERE (fr.receiver_id = $1 OR fr.sender_id = $1) AND fr.status = $2
       ORDER BY fr.created_at DESC`,
      [req.user.userId, 'pending']
    );

    // Format the response to match frontend expectations
    const formattedRequests = result.rows.map(row => ({
      id: row.id,
      sender_id: row.sender_id,
      receiver_id: row.receiver_id,
      status: row.status,
      created_at: row.created_at,
      sender_profile: {
        full_name: row.sender_name,
        email: row.sender_email,
        profile_picture_url: row.sender_picture
      },
      receiver_profile: {
        full_name: row.receiver_name,
        email: row.receiver_email,
        profile_picture_url: row.receiver_picture
      }
    }));

    res.json(formattedRequests);
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/get-friends', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.id, f.friend_id, f.created_at,
              u.id as friend_user_id, u.email, u.full_name, u.profile_picture_url
       FROM friendships f
       JOIN users u ON f.friend_id = u.id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [req.user.userId]
    );

    // Format the response to match frontend expectations
    const formattedFriends = result.rows.map(row => ({
      id: row.id,
      user_id: req.user.userId,
      friend_id: row.friend_id,
      created_at: row.created_at,
      friend_profile: {
        id: row.friend_user_id,
        full_name: row.full_name,
        email: row.email,
        profile_picture_url: row.profile_picture_url
      }
    }));

    res.json(formattedFriends);
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/accept-friend-request', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    // Get friend request
    const requestResult = await pool.query(
      'SELECT sender_id, receiver_id FROM friend_requests WHERE id = $1 AND receiver_id = $2',
      [requestId, req.user.userId]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    const { sender_id, receiver_id } = requestResult.rows[0];

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Update request status
      await pool.query(
        'UPDATE friend_requests SET status = $1 WHERE id = $2',
        ['accepted', requestId]
      );

      // Create friendship (both directions)
      await pool.query(
        'INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2), ($2, $1)',
        [sender_id, receiver_id]
      );

      await pool.query('COMMIT');

      res.json({ message: 'Friend request accepted successfully' });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/remove-friend', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ error: 'Friend ID is required' });
    }

    // Remove friendship (both directions)
    await pool.query(
      'DELETE FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
      [req.user.userId, friendId]
    );

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/get-friend-profile-picture', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ error: 'Friend ID is required' });
    }

    // Verify friendship exists
    const friendshipResult = await pool.query(
      'SELECT id FROM friendships WHERE user_id = $1 AND friend_id = $2',
      [req.user.userId, friendId]
    );

    if (friendshipResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not friends with this user' });
    }

    // Get friend's profile picture
    const userResult = await pool.query(
      'SELECT profile_picture_url FROM users WHERE id = $1',
      [friendId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ profile_picture_url: userResult.rows[0].profile_picture_url });
  } catch (error) {
    console.error('Get friend profile picture error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Profile endpoints
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, profile_picture_url, motivation_text, gender, created_at, reset_date FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { full_name, gender, profile_picture_url } = req.body;
    
    // Build dynamic query based on provided fields
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (full_name !== undefined) {
      updates.push(`full_name = $${paramCount}`);
      values.push(full_name);
      paramCount++;
    }

    if (gender !== undefined) {
      updates.push(`gender = $${paramCount}`);
      values.push(gender);
      paramCount++;
    }

    if (profile_picture_url !== undefined) {
      updates.push(`profile_picture_url = $${paramCount}`);
      values.push(profile_picture_url);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(req.user.userId); // Add user ID as last parameter

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, email, full_name, profile_picture_url, motivation_text, gender, created_at, reset_date`;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/profile/motivation', authenticateToken, async (req, res) => {
  try {
    const { motivation_text } = req.body;

    const result = await pool.query(
      'UPDATE users SET motivation_text = $1 WHERE id = $2 RETURNING id, email, full_name, profile_picture_url, motivation_text, gender, created_at, reset_date',
      [motivation_text, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update motivation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/profile/reset', authenticateToken, async (req, res) => {
  try {
    // Start a transaction
    await pool.query('BEGIN');

    try {
      // Update profile reset date to current time
      await pool.query(
        'UPDATE users SET reset_date = $1 WHERE id = $2',
        [new Date().toISOString(), req.user.userId]
      );

      // Delete all drink entries
      await pool.query(
        'DELETE FROM drink_entries WHERE user_id = $1',
        [req.user.userId]
      );

      // Delete all goals
      await pool.query(
        'DELETE FROM user_goals WHERE user_id = $1',
        [req.user.userId]
      );

      // Delete all health assessments (if table exists)
      await pool.query(
        'DELETE FROM health_assessments WHERE user_id = $1',
        [req.user.userId]
      ).catch(() => {
        // Ignore error if table doesn't exist
        console.log('Health assessments table not found, skipping...');
      });

      // Delete all user settings (if table exists)
      await pool.query(
        'DELETE FROM user_settings WHERE user_id = $1',
        [req.user.userId]
      ).catch(() => {
        // Ignore error if table doesn't exist
        console.log('User settings table not found, skipping...');
      });

      // Commit the transaction
      await pool.query('COMMIT');

      res.json({ message: 'Application reset successfully' });
    } catch (error) {
      // Rollback the transaction on error
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Reset application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Friend data endpoints - these allow friends to view each other's data
// Get friend profile
app.get('/api/friends/:friendId/profile', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.params;

    // Verify friendship exists
    const friendshipResult = await pool.query(
      'SELECT id FROM friendships WHERE user_id = $1 AND friend_id = $2',
      [req.user.userId, friendId]
    );

    if (friendshipResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not friends with this user' });
    }

    // Get friend's profile
    const result = await pool.query(
      'SELECT id, email, full_name, profile_picture_url, motivation_text, created_at FROM users WHERE id = $1',
      [friendId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get friend profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get friend goals
app.get('/api/friends/:friendId/goals', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.params;

    // Verify friendship exists
    const friendshipResult = await pool.query(
      'SELECT id FROM friendships WHERE user_id = $1 AND friend_id = $2',
      [req.user.userId, friendId]
    );

    if (friendshipResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not friends with this user' });
    }

    // Get friend's goals
    const result = await pool.query(
      'SELECT id, goal_type, target_drinks, start_date, end_date, is_active, created_at FROM user_goals WHERE user_id = $1 ORDER BY created_at DESC',
      [friendId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get friend goals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get friend's drinks for today
app.get('/api/friends/:friendId/drinks/today', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.params;
    const { date } = req.query;

    // Verify friendship exists
    const friendshipResult = await pool.query(
      'SELECT id FROM friendships WHERE user_id = $1 AND friend_id = $2',
      [req.user.userId, friendId]
    );

    if (friendshipResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not friends with this user' });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const startOfDay = `${targetDate}T00:00:00.000Z`;
    const endOfDay = `${targetDate}T23:59:59.999Z`;

    // Get friend's drink entries for the specified date (using same timezone logic as regular drinks endpoint)
    const result = await pool.query(
      `SELECT SUM(drink_count) as total_drinks 
       FROM drink_entries 
       WHERE user_id = $1 
       AND logged_at >= $2 
       AND logged_at <= $3`,
      [friendId, startOfDay, endOfDay]
    );

    const totalDrinks = parseInt(result.rows[0].total_drinks) || 0;
    res.json({ totalDrinks });
  } catch (error) {
    console.error('Get friend drinks today error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get friend's chart data
app.get('/api/friends/:friendId/drinks/chart', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.params;
    const { timeRange } = req.query;

    // Verify friendship exists
    const friendshipResult = await pool.query(
      'SELECT id FROM friendships WHERE user_id = $1 AND friend_id = $2',
      [req.user.userId, friendId]
    );

    if (friendshipResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not friends with this user' });
    }

    const now = new Date();
    let startDate;
    
    // Helper function to get Monday of the current week
    const getMonday = (date) => {
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date);
      monday.setDate(diff);
      return monday;
    };
    
    // Calculate start date based on time range
    switch (timeRange) {
      case 'week':
        // Start from Monday of current week
        startDate = getMonday(new Date(now));
        break;
      case 'month':
        // Start from first day of current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        // Start from January 1st of current year
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = getMonday(new Date(now));
    }

    // Get friend's drink entries within the date range
    console.log(`Friend chart data query - friendId: ${friendId}, timeRange: ${timeRange}`);
    console.log(`Date range: ${startDate.toISOString()} to ${now.toISOString()}`);
    
    const result = await pool.query(
      `SELECT DATE(logged_at AT TIME ZONE 'UTC') as date, SUM(drink_count) as total_drinks
       FROM drink_entries 
       WHERE user_id = $1 
       AND logged_at >= $2 
       AND logged_at <= $3
       GROUP BY DATE(logged_at AT TIME ZONE 'UTC')
       ORDER BY DATE(logged_at AT TIME ZONE 'UTC')`,
      [friendId, startDate.toISOString(), now.toISOString()]
    );
    
    console.log(`Found ${result.rows.length} date groups for friend ${friendId}:`, result.rows);

    // Process the data to create labels and data arrays
    const labels = [];
    const data = [];
    
    if (timeRange === 'week') {
      // Daily data from Monday to Sunday of current week
      const monday = getMonday(new Date(now));
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayData = result.rows.find(row => {
          const rowDateStr = row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date;
          return rowDateStr === dateStr;
        });
        
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        data.push(dayData ? parseInt(dayData.total_drinks) : 0);
      }
    } else if (timeRange === 'month') {
      // Weekly data for current month (Week 1, Week 2, Week 3, Week 4)
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
      
      // Find the first Monday of the month (or before if month doesn't start on Monday)
      const firstMonday = getMonday(new Date(firstDayOfMonth));
      if (firstMonday > firstDayOfMonth) {
        firstMonday.setDate(firstMonday.getDate() - 7);
      }
      
      // Create 4 weeks of data
      for (let week = 1; week <= 4; week++) {
        const weekStart = new Date(firstMonday);
        weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const weekData = result.rows.filter(row => {
          const rowDate = row.date instanceof Date ? row.date : new Date(row.date + 'T00:00:00Z');
          return rowDate >= weekStart && rowDate <= weekEnd;
        });
        
        const weekTotal = weekData.reduce((sum, row) => sum + parseInt(row.total_drinks), 0);
        labels.push(`Week ${week}`);
        data.push(weekTotal);
      }
    } else if (timeRange === 'year') {
      // Monthly data for current year (January to December)
      const currentYear = now.getFullYear();
      
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(currentYear, month, 1);
        const monthEnd = new Date(currentYear, month + 1, 0);
        
        const monthData = result.rows.filter(row => {
          const rowDate = row.date instanceof Date ? row.date : new Date(row.date + 'T00:00:00Z');
          return rowDate >= monthStart && rowDate <= monthEnd;
        });
        
        const monthTotal = monthData.reduce((sum, row) => sum + parseInt(row.total_drinks), 0);
        labels.push(monthStart.toLocaleDateString('en-US', { month: 'short' }));
        data.push(monthTotal);
      }
    }

    console.log(`Final friend chart data for ${friendId}:`, { labels, data });
    res.json({ labels, data });
  } catch (error) {
    console.error('Get friend chart data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/upload/profile-picture', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('DEBUG: Profile picture upload request received');
    console.log('DEBUG: User ID:', req.user.userId);
    console.log('DEBUG: Request headers:', req.headers);
    console.log('DEBUG: File info:', req.file);
    
    if (!req.file) {
      console.log('DEBUG: No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate a unique filename
    const fileExtension = path.extname(req.file.originalname);
    const fileName = `profile-${req.user.userId}-${Date.now()}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    // Move the uploaded file to the correct location
    fs.renameSync(req.file.path, filePath);

    // Update user's profile picture URL in database
    const profilePictureUrl = `/uploads/${fileName}`;
    await pool.query(
      'UPDATE users SET profile_picture_url = $1 WHERE id = $2',
      [profilePictureUrl, req.user.userId]
    );

    res.json({ 
      fileName: profilePictureUrl,
      message: 'Profile picture uploaded successfully' 
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Static files for uploads
app.use('/uploads', express.static(uploadDir));

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ETOH Tracker API server running on port ${PORT}`);
  console.log(`📊 Database: ${process.env.DB_NAME}`);
  console.log(`📁 Upload directory: ${uploadDir}`);
});