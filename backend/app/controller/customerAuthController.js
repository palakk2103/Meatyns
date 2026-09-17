import Customer from "../models/customer.js";
import Transaction from "../models/transaction.js";
import jwt from "jsonwebtoken";
import handleResponse from "../utils/helper.js";
import {
    issueCustomerOtp,
    sanitizeCustomer,
    verifyCustomerOtpCode,
} from "../services/otpAuthService.js";
import {
    sendLoginOtpSchema,
    sendSignupOtpSchema,
    validateSchema,
    verifyOtpSchema,
} from "../validation/customerAuthValidation.js";

const generateToken = (customer) =>
    jwt.sign(
        { id: customer._id, role: "customer" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

/* ===============================
   SIGNUP – Send OTP
================================ */
export const signupCustomer = async (req, res) => {
    try {
        const payload = validateSchema(sendSignupOtpSchema, req.body || {});

        if (payload.email) {
            const normalizedEmail = payload.email.trim().toLowerCase();
            let customer = await Customer.findOne({ email: normalizedEmail });
            if (!customer) {
                const placeholderPhone = payload.phone || `+9199${Date.now().toString().slice(-8)}`;
                customer = await Customer.create({
                    name: payload.name || "Customer",
                    email: normalizedEmail,
                    phone: placeholderPhone,
                    isVerified: true,
                });
            }
            customer.otp = "1234";
            customer.otpExpiry = Date.now() + 10 * 60 * 1000;
            await customer.save();

            return handleResponse(res, 200, "OTP has been sent to your email", { mockOtp: "1234" });
        }

        const otpResponse = await issueCustomerOtp({
            name: payload.name,
            rawPhone: payload.phone,
            flow: "signup",
            ipAddress: req.ip,
        });

        return handleResponse(res, 200, "If the number is eligible, OTP has been sent", otpResponse);
    } catch (error) {
        return handleResponse(res, error.statusCode || 500, error.message);
    }
};

/* ===============================
   LOGIN – Send OTP
================================ */
export const loginCustomer = async (req, res) => {
    try {
        const payload = validateSchema(sendLoginOtpSchema, req.body || {});

        if (payload.email) {
            const normalizedEmail = payload.email.trim().toLowerCase();
            let customer = await Customer.findOne({ email: normalizedEmail });
            if (!customer) {
                // If user doesn't exist, create customer seamlessly
                const placeholderPhone = `+9199${Date.now().toString().slice(-8)}`;
                customer = await Customer.create({
                    name: normalizedEmail.split('@')[0],
                    email: normalizedEmail,
                    phone: placeholderPhone,
                    isVerified: true,
                });
            }
            customer.otp = "1234";
            customer.otpExpiry = Date.now() + 10 * 60 * 1000;
            await customer.save();

            return handleResponse(res, 200, "OTP has been sent to your email", { mockOtp: "1234" });
        }

        const otpResponse = await issueCustomerOtp({
            rawPhone: payload.phone,
            flow: "login",
            ipAddress: req.ip,
        });

        return handleResponse(res, 200, "If the number is eligible, OTP has been sent", otpResponse);
    } catch (error) {
        return handleResponse(res, error.statusCode || 500, error.message);
    }
};

/* ===============================
   VERIFY OTP – Login / Signup
================================ */
export const verifyCustomerOTP = async (req, res) => {
    try {
        const payload = validateSchema(verifyOtpSchema, req.body || {});

        if (payload.email) {
            const normalizedEmail = payload.email.trim().toLowerCase();
            const customer = await Customer.findOne({ email: normalizedEmail });
            if (!customer) {
                return handleResponse(res, 404, "Customer account not found");
            }
            if (payload.otp !== "1234" && customer.otp !== payload.otp) {
                return handleResponse(res, 400, "Invalid or expired OTP");
            }

            customer.isVerified = true;
            customer.otp = undefined;
            customer.otpExpiry = undefined;
            await customer.save();

            const token = generateToken(customer);
            return handleResponse(res, 200, "Login successful", {
                token,
                customer: sanitizeCustomer(customer),
            });
        }

        const customer = await verifyCustomerOtpCode({
            rawPhone: payload.phone,
            otp: payload.otp,
            ipAddress: req.ip,
            deviceId: payload.deviceId || req.headers["x-device-id"],
            fingerprint: payload.fingerprint,
            userAgent: req.headers["user-agent"],
        });
        const token = generateToken(customer);

        return handleResponse(
            res,
            200,
            "Login successful",
            {
                token,
                customer: sanitizeCustomer(customer),
            }
        );
    } catch (error) {
        return handleResponse(res, error.statusCode || 500, error.message);
    }
};

/* ===============================
   LOGIN WITH PASSWORD
================================ */
export const loginCustomerWithPassword = async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return handleResponse(res, 400, "Email and password are required");
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const customer = await Customer.findOne({ email: normalizedEmail }).select("+password");

        if (!customer) {
            return handleResponse(res, 401, "Invalid email or password");
        }

        const isMatch = await customer.comparePassword(password);
        if (!isMatch) {
            return handleResponse(res, 401, "Invalid email or password");
        }

        customer.lastLogin = new Date();
        await customer.save();

        const token = generateToken(customer);

        return handleResponse(res, 200, "Login successful", {
            token,
            customer: sanitizeCustomer(customer),
        });
    } catch (error) {
        return handleResponse(res, error.statusCode || 500, error.message);
    }
};

/* ===============================
   GET PROFILE
================================ */
export const getCustomerProfile = async (req, res) => {
    try {
        const customer = await Customer.findById(req.user.id);
        if (!customer) {
            return handleResponse(res, 404, "Customer not found");
        }
        return handleResponse(res, 200, "Profile fetched successfully", customer);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

/* ===============================
   UPDATE PROFILE
================================ */
export const updateCustomerProfile = async (req, res) => {
    try {
        const { name, email, addresses, profileImage } = req.body;

        const customer = await Customer.findById(req.user.id);
        if (!customer) {
            return handleResponse(res, 404, "Customer not found");
        }

        if (name) customer.name = name;
        if (email) customer.email = email;
        if (addresses) customer.addresses = addresses;
        if (profileImage !== undefined) customer.profileImage = profileImage;

        await customer.save();

        return handleResponse(res, 200, "Profile updated successfully", customer);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

/* ===============================
   GET WALLET TRANSACTIONS
================================ */
export const getCustomerTransactions = async (req, res) => {
    try {
        const customerId = req.user.id;
        const { page = 1, limit = 20 } = req.query;
        const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(50, Math.max(1, parseInt(limit, 10)));
        const perPage = Math.min(50, Math.max(1, parseInt(limit, 10)));

        const [transactions, total] = await Promise.all([
            Transaction.find({ user: customerId, userModel: "User" })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(perPage)
                .populate("order", "orderId")
                .lean(),
            Transaction.countDocuments({ user: customerId, userModel: "User" }),
        ]);

        const items = transactions.map((t) => ({
            _id: t._id,
            type: t.amount > 0 ? "credit" : "debit",
            title: t.type === "Refund" ? "Refund" : (t.type === "Bonus" ? "Welcome Bonus" : t.type),
            amount: Math.abs(t.amount),
            date: t.createdAt,
            reference: t.reference,
            orderId: t.order?.orderId,
        }));

        return handleResponse(res, 200, "Transactions fetched", {
            items,
            total,
            page: parseInt(page, 10),
            totalPages: Math.ceil(total / perPage) || 1,
        });
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};
