"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const contactSchema = new mongoose_1.default.Schema({
    name: {
        type: String,
        required: [true, "Enter your name"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Enter your email"],
        trim: true,
    },
    phone: {
        type: Number,
        required: [true, "Enter your phone number"],
    },
    message: {
        type: String,
        required: [true, "Enter your message"],
        trim: true,
    },
}, {
    timestamps: true,
});
const Contact = mongoose_1.default.model("Contact", contactSchema);
exports.default = Contact;
