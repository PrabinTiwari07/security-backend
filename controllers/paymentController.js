const axios = require('axios');
const crypto = require('crypto');

const KHALTI_SECRET_KEY = '357156b0d96043a8a78df09467726289';
const KHALTI_PUBLIC_KEY = 'a4caabe9ab994f23b5008eac64e5d154';

exports.initiateKhaltiPayment = async (req, res) => {
    try {
        const {
            return_url,
            website_url,
            amount,
            purchase_order_id,
            purchase_order_name,
            customer_info,
            amount_breakdown
        } = req.body;

        const khaltiPayload = {
            return_url,
            website_url,
            amount,
            purchase_order_id,
            purchase_order_name,
            customer_info,
            amount_breakdown
        };


        const response = await axios.post('https://a.khalti.com/api/v2/epayment/initiate/', khaltiPayload, {
            headers: {
                'Authorization': `Key ${KHALTI_SECRET_KEY}`,
                'Content-Type': 'application/json',
            }
        });


        if (response.data && response.data.payment_url) {
            res.json({
                success: true,
                payment_url: response.data.payment_url,
                pidx: response.data.pidx
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to get payment URL from Khalti'
            });
        }

    } catch (error) {
        console.error('Khalti initiation error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: error.response?.data?.message || 'Failed to initialize payment',
            details: error.response?.data
        });
    }
};

exports.verifyKhaltiPayment = async (req, res) => {
    try {
        const { pidx } = req.body;

        if (!pidx) {
            return res.status(400).json({
                success: false,
                message: 'Payment ID (pidx) is required'
            });
        }


        const response = await axios.post('https://a.khalti.com/api/v2/epayment/lookup/',
            { pidx },
            {
                headers: {
                    'Authorization': `Key ${KHALTI_SECRET_KEY}`,
                    'Content-Type': 'application/json',
                }
            }
        );


        if (response.data) {
            res.json({
                success: true,
                status: response.data.status,
                payment_data: response.data,
                message: `Payment status: ${response.data.status}`
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }

    } catch (error) {
        console.error('Khalti verification error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to verify payment',
            details: error.response?.data
        });
    }
};

exports.getPaymentStatus = async (req, res) => {
    try {
        const { pidx } = req.params;

        const response = await axios.post('https://a.khalti.com/api/v2/epayment/lookup/',
            { pidx },
            {
                headers: {
                    'Authorization': `Key ${KHALTI_SECRET_KEY}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        if (response.data) {
            res.json({
                success: true,
                status: response.data.status,
                payment_data: response.data
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to get payment status'
            });
        }

    } catch (error) {
        console.error('Get payment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get payment status'
        });
    }
};