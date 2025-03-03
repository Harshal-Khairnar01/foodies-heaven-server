"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.contact = void 0;
const catchAsyncError_1 = require("../middleware/catchAsyncError");
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const sendMail_1 = __importDefault(require("../utils/sendMail"));
const contact_model_1 = __importDefault(require("../models/contact.model"));
exports.contact = (0, catchAsyncError_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { name, email, phone, message } = req.body;
        console.log(req.body);
        if ([name, email, phone, message].some((field) => typeof field === "string" && field.trim() === "")) {
            return next(new ErrorHandler_1.default("All fileds are required!", 400));
        }
        const data = {
            name,
            email,
            phone,
            message,
        };
        // Save in database
        const newContact = await contact_model_1.default.create(data);
        // Send confirmation mail
        await (0, sendMail_1.default)({
            email: data.email,
            subject: "Your query reached successfully!",
            template: "contact-mail.ejs",
            data,
        });
        return res.status(201).json({
            success: true,
            message: "Your message has been sent successfully!",
            data: newContact,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
