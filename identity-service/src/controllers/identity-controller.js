const logger = require('../utils/logger');
const { validateRegistration, validateLogin } = require('../utils/validation');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const RefreshToken = require('../models/RefreshToken');

// registration
const registerUser = async (req, res) => {
    logger.info('Registering endpoint called');

    try {
        const { error } = validateRegistration(req.body);
        if (error) {
            logger.warn('Validation failed: %s', error.details[0].message);
            return res.status(400).json({ success: false, message: error.details[0].message });
        }

        const { username, email, password } = req.body;

        let user = await User.findOne({ $or: [{ username }, { email }] });
        if (user) {
            logger.warn('User already exists with username: %s or email: %s', username, email);
            return res.status(400).json({
                success: false,
                message: 'Username or email already exists',
            });
        }

        user = new User({ username, email, password });
        await user.save();
        logger.info('User registered successfully: %s', user.username);

        const { accessToken, refreshToken } = await generateToken(user);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            accessToken,
            refreshToken,
        });
    } catch (error) {
        logger.error('Error in registerUser: %s', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// user login
const loginUser = async (req, res) => {
    logger.info('Login endpoint called');

    try {
        const { error } = validateLogin(req.body);
        if (error) {
            logger.warn('Validation failed: %s', error.details[0].message);
            return res.status(400).json({ success: false, message: error.details[0].message });
        }

        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            logger.warn('Login failed: User not found with email: %s', email);
            return res.status(400).json({ success: false, message: 'Invalid email or password' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            logger.warn('Login failed: Incorrect password for email: %s', email);
            return res.status(400).json({ success: false, message: 'Invalid email or password' });
        }

        const { accessToken, refreshToken } = await generateToken(user);
        logger.info('User logged in successfully: %s', user.username);

        res.json({
            success: true,
            message: 'Login successful',
            accessToken,
            refreshToken,
        });
    } catch (error) {
        logger.error('Error in loginUser: %s', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// refresh token
const refreshToken = async (req, res) => {
    logger.info('Refresh token endpoint called');

    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            logger.warn('Refresh token not provided');
            return res.status(400).json({ success: false, message: 'Refresh token is required' });
        }

        const storedToken = await RefreshToken.findOne({ token: refreshToken });
        if (!storedToken) {
            logger.warn('Invalid refresh token: %s', refreshToken);
            return res.status(400).json({ success: false, message: 'Invalid refresh token' });
        }

        const user = await User.findById(storedToken.userId);
        if (!user) {
            logger.warn('Invalid refresh token: %s', refreshToken);
            return res.status(400).json({ success: false, message: 'Invalid refresh token' });
        }

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await generateToken(
            user,
            refreshToken,
        );
        await RefreshToken.deleteOne({ _id: storedToken._id });
        logger.info('Access token refreshed successfully for user: %s', user.username);

        res.json({
            success: true,
            message: 'Access token refreshed successfully',
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });
    } catch (error) {
        logger.error('Error in refreshToken: %s', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const logout = async (req, res) => {
    logger.info('Logout endpoint called');

    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            logger.warn('Refresh token not provided for logout');
            return res.status(400).json({ success: false, message: 'Refresh token is required' });
        }

        await RefreshToken.deleteOne({ token: refreshToken });
        logger.info('User logged out successfully');

        res.json({ success: true, message: 'Logout successful' });
    } catch (error) {
        logger.error('Error in logout: %s', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    refreshToken,
    logout,
};
