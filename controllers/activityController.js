const Activity = require('../model/Activity');
const User = require('../model/user');

const getAllActivities = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            userId,
            action,
            severity,
            startDate,
            endDate,
            search
        } = req.query;

        const query = {};

        if (userId) {
            query.userId = userId;
        }

        if (action) {
            query.action = action;
        }

        if (severity) {
            query.severity = severity;
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                query.createdAt.$lte = new Date(endDate);
            }
        }

        if (search) {
            query.$or = [
                { description: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }

        console.log('Activity query:', JSON.stringify(query, null, 2));

        const activities = await Activity.find(query)
            .populate('userId', 'username email role')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Activity.countDocuments(query);

        console.log(`Found ${activities.length} activities, Total: ${total}`);

        res.json({
            success: true,
            activities,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total,
            message: total === 0 ? 'No activities found. Activities will appear here once users start interacting with the system.' : `Found ${total} activities`
        });
    } catch (error) {
        console.error('Activity fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

const getActivityStats = async (req, res) => {
    try {
        const { period = '7d' } = req.query;

        let dateFilter = {};
        const now = new Date();

        switch (period) {
            case '1d':
                dateFilter = { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
                break;
            case '7d':
                dateFilter = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
                break;
            case '30d':
                dateFilter = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
                break;
            case '90d':
                dateFilter = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
                break;
        }

        const query = dateFilter ? { createdAt: dateFilter } : {};

        // Activity counts by action
        const actionStats = await Activity.aggregate([
            { $match: query },
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const severityStats = await Activity.aggregate([
            { $match: query },
            { $group: { _id: '$severity', count: { $sum: 1 } } }
        ]);

        const userStats = await Activity.aggregate([
            { $match: query },
            { $group: { _id: '$userId', username: { $first: '$username' }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        const dailyStats = await Activity.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]);

        const totalActivities = await Activity.countDocuments(query);
        const uniqueUsers = await Activity.distinct('userId', query);

        res.json({
            totalActivities,
            uniqueUsers: uniqueUsers.length,
            actionStats,
            severityStats,
            userStats,
            dailyStats
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getUserActivities = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const activities = await Activity.find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Activity.countDocuments({ userId });

        res.json({
            activities,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const cleanupActivities = async (req, res) => {
    try {
        const { days = 90 } = req.body;
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const result = await Activity.deleteMany({
            createdAt: { $lt: cutoffDate }
        });

        res.json({
            message: `Deleted ${result.deletedCount} activities older than ${days} days`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const exportActivities = async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            userId,
            action,
            severity
        } = req.query;

        const query = {};

        if (userId) query.userId = userId;
        if (action) query.action = action;
        if (severity) query.severity = severity;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const activities = await Activity.find(query)
            .populate('userId', 'username email')
            .sort({ createdAt: -1 })
            .limit(5000);

        const csvHeader = 'Date,Time,Username,Action,Description,IP Address,Method,Endpoint,Status Code,Severity\n';
        const csvData = activities.map(activity => {
            const date = new Date(activity.createdAt);
            return [
                date.toISOString().split('T')[0],
                date.toTimeString().split(' ')[0],
                activity.username,
                activity.action,
                `"${activity.description.replace(/"/g, '""')}"`,
                activity.ipAddress,
                activity.method,
                activity.endpoint,
                activity.statusCode,
                activity.severity
            ].join(',');
        }).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=activities-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csvHeader + csvData);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getAllActivities,
    getActivityStats,
    getUserActivities,
    cleanupActivities,
    exportActivities
};
