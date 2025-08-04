const User = require('../model/user');
const sendOtpEmail = require('./sendOtpEmail');

const checkPasswordExpiry = async () => {
    try {
        console.log('Checking for password expiry...');

        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const usersWithExpiringPasswords = await User.find({
            passwordExpiresAt: {
                $gte: now,
                $lte: sevenDaysFromNow
            },
            isVerified: true
        });

        console.log(`Found ${usersWithExpiringPasswords.length} users with expiring passwords`);

        for (const user of usersWithExpiringPasswords) {
            const daysUntilExpiry = Math.ceil((user.passwordExpiresAt - now) / (1000 * 60 * 60 * 24));

            await sendOtpEmail({
                email: user.email,
                name: user.fullName,
                type: 'password-expiry-reminder',
                daysUntilExpiry
            });

            console.log(`Sent password expiry reminder to ${user.email} (${daysUntilExpiry} days)`);
        }

        const usersWithExpiredPasswords = await User.find({
            passwordExpiresAt: { $lt: now },
            mustChangePassword: false,
            isVerified: true
        });

        if (usersWithExpiredPasswords.length > 0) {
            await User.updateMany(
                { _id: { $in: usersWithExpiredPasswords.map(u => u._id) } },
                { mustChangePassword: true }
            );

            console.log(`Marked ${usersWithExpiredPasswords.length} users for mandatory password change`);

            for (const user of usersWithExpiredPasswords) {
                await sendOtpEmail({
                    email: user.email,
                    name: user.fullName,
                    type: 'password-expired'
                });
            }
        }

    } catch (error) {
        console.error('Error checking password expiry:', error);
    }
};

module.exports = { checkPasswordExpiry };
