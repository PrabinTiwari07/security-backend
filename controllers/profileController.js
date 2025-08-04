
const Profile = require('../model/profile');
const User = require('../model/user');

exports.getProfile = async (req, res) => {
    try {
        const user = req.user;
        if (!user) return res.status(404).json({ message: "User not found." });

        let profile = await Profile.findOne({ user: user._id });

        if (!profile) {
            profile = await Profile.create({ user: user._id });
        }

        res.json({
            user: {
                fullName: user.fullName || `${user.firstName} ${user.lastName}`,
                email: user.email,
                phone: user.phone,
                address: user.address,
                role: user.role,
                profileImage: profile.profileImage || '',
                license: profile.license || {
                    licenseNumber: '',
                    fullName: '',
                    expiryDate: null,
                    licenseImage: '',
                    status: 'pending',
                    uploadedAt: null,
                    verifiedAt: null
                }
            },
            profile,
        });
    } catch (err) {
        console.error("GET PROFILE ERROR:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        console.log('FILES:', req.files);
        console.log('BODY:', req.body);

        const updates = { ...req.body };

        if (req.files && req.files.profileImage) {
            updates.profileImage = `/uploads/${req.files.profileImage[0].filename}`;
        }

        if (req.files && req.files.licenseImage) {
            updates['license.licenseImage'] = `/uploads/${req.files.licenseImage[0].filename}`;
            updates['license.uploadedAt'] = new Date();
            updates['license.status'] = 'pending';
        }

        if (req.body.licenseNumber) {
            updates['license.licenseNumber'] = req.body.licenseNumber;
        }
        if (req.body.licenseFullName) {
            updates['license.fullName'] = req.body.licenseFullName;
        }
        if (req.body.licenseExpiryDate) {
            updates['license.expiryDate'] = new Date(req.body.licenseExpiryDate);
        }

        const profile = await Profile.findOneAndUpdate(
            { user: req.user._id },
            updates,
            { new: true, upsert: true }
        );

        const userUpdates = {};
        if (updates.fullName) userUpdates.fullName = updates.fullName;
        if (updates.address) userUpdates.address = updates.address;
        if (updates.phone) userUpdates.phone = updates.phone;
        if (updates.profileImage) userUpdates.profileImage = updates.profileImage;

        if (Object.keys(userUpdates).length > 0) {
            await User.findByIdAndUpdate(req.user._id, userUpdates);
        }

        res.json({ message: 'Profile updated successfully', profile });
    } catch (err) {
        console.error('UPDATE PROFILE ERROR:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.updateLicenseStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;

        console.log(`Admin ${req.user._id} updating license status for user ${userId} to ${status}`);

        if (!['pending', 'verified', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Must be pending, verified, or rejected.' });
        }

        const updateData = {
            'license.status': status
        };

        if (status === 'verified') {
            updateData['license.verifiedAt'] = new Date();
        } else if (status === 'rejected') {
            updateData['license.verifiedAt'] = null;
        }

        const profile = await Profile.findOneAndUpdate(
            { user: userId },
            updateData,
            { new: true }
        ).populate('user', 'fullName email phone address role');

        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        console.log(`License status updated successfully: ${profile.license.status}`);

        res.json({
            success: true,
            message: `License ${status} successfully`,
            profile: {
                _id: profile._id,
                user: profile.user,
                license: profile.license,
                profileImage: profile.profileImage
            }
        });
    } catch (err) {
        console.error('UPDATE LICENSE STATUS ERROR:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to update license status',
            error: err.message
        });
    }
};

exports.getAllProfiles = async (req, res) => {
    try {
        const { status, search } = req.query;

        console.log(`Admin ${req.user._id} fetching profiles with filters:`, { status, search });

        let query = {};

        if (status && status !== 'all') {
            query['license.status'] = status;
        }

        let profiles = await Profile.find(query)
            .populate('user', 'fullName email phone address role firstName lastName')
            .sort({ 'license.uploadedAt': -1 });

        if (search) {
            const searchLower = search.toLowerCase();
            profiles = profiles.filter(profile => {
                const user = profile.user;
                const license = profile.license;

                return (
                    user?.fullName?.toLowerCase().includes(searchLower) ||
                    user?.email?.toLowerCase().includes(searchLower) ||
                    user?.phone?.includes(search) ||
                    license?.licenseNumber?.toLowerCase().includes(searchLower) ||
                    `${user?.firstName} ${user?.lastName}`.toLowerCase().includes(searchLower)
                );
            });
        }

        console.log(`Found ${profiles.length} profiles matching criteria`);

        res.json({
            success: true,
            count: profiles.length,
            profiles
        });
    } catch (err) {
        console.error('GET ALL PROFILES ERROR:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profiles',
            error: err.message
        });
    }
};

exports.getLicenseStats = async (req, res) => {
    try {
        const stats = await Profile.aggregate([
            {
                $group: {
                    _id: '$license.status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalProfiles = await Profile.countDocuments();

        const formattedStats = {
            total: totalProfiles,
            pending: 0,
            verified: 0,
            rejected: 0
        };

        stats.forEach(stat => {
            if (stat._id) {
                formattedStats[stat._id] = stat.count;
            }
        });

        res.json({
            success: true,
            stats: formattedStats
        });
    } catch (err) {
        console.error('GET LICENSE STATS ERROR:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch license statistics',
            error: err.message
        });
    }
};