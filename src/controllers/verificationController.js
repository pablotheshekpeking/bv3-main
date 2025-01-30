import { sendVerificationCode, verifyCode } from '../services/verificationService.js';

export const sendVerificationCodeHandler = async (req, res) => {
    try {
        const { userId, type } = req.body;
        const result = await sendVerificationCode(userId, type);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const verifyCodeHandler = async (req, res) => {
    try {
        const { userId, type, code } = req.body;
        const result = await verifyCode(userId, type, code);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}; 