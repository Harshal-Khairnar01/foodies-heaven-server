"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const recipe_model_1 = __importDefault(require("./recipe.model"));
const emailRegexPattern = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
const userSchema = new mongoose_1.default.Schema({
    username: {
        type: String,
        required: [true, "Please enter your name"],
        trim: true,
        unique: false,
    },
    email: {
        type: String,
        required: [true, "Please enter your email"],
        validate: {
            validator: function (value) {
                return emailRegexPattern.test(value);
            },
            message: "please enter a valid email",
        },
        unique: true,
    },
    password: {
        type: String,
        // required: [true, "Please enter your password"],  // for social auth
        minlength: [6, "Password must be atleast 6 characters!"],
        select: false,
    },
    avatar: {
        public_id: String,
        url: String,
    },
    role: {
        type: String,
        default: "user",
    },
    recipes: [
        {
            recipeId: {
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: "Recipe",
            },
        },
    ],
}, {
    timestamps: true,
});
// Hash Password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        next();
    }
    this.password = await bcryptjs_1.default.hash(this.password, 10);
    next();
});
// Pre-hook to delete all recipes when a user is deleted
userSchema.pre("findOneAndDelete", async function (next) {
    try {
        const userId = this.getQuery()._id; // Get the ID of the user being deleted
        if (userId) {
            // Delete all recipes associated with the user
            await recipe_model_1.default.deleteMany({ "user._id": userId });
        }
        next();
    }
    catch (error) {
        next(error);
    }
});
// sign access token
userSchema.methods.SignAccessToken = function () {
    return jsonwebtoken_1.default.sign({
        id: this._id,
        email: this.email,
    }, process.env.ACCESS_TOKEN_SECRET || "", {
        expiresIn: "5m",
    });
};
// sign refresh token
userSchema.methods.SignRefreshToken = function () {
    return jsonwebtoken_1.default.sign({
        id: this._id,
    }, process.env.REFRESH_TOKEN_SECRET || "", {
        expiresIn: "3d",
    });
};
// compare password
userSchema.methods.comparePassword = async function (password) {
    return await bcryptjs_1.default.compare(password, this.password);
};
const User = mongoose_1.default.model("User", userSchema);
exports.default = User;
