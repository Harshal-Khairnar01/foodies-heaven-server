"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = exports.isAuthenticated = void 0;
const catchAsyncError_1 = require("./catchAsyncError");
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const redis_1 = require("../utils/redis");
// import { updateAccessToken } from "../controllers/user.controller";
// authenticated user
exports.isAuthenticated = (0, catchAsyncError_1.CatchAsyncError)(async (req, res, next) => {
    const accessToken = req.cookies.accessToken;
    if (!accessToken) {
        return next(new ErrorHandler_1.default("please login to access the resource", 400));
    }
    const decoded = jsonwebtoken_1.default.decode(accessToken);
    if (!decoded) {
        return next(new ErrorHandler_1.default("Access Token is not valid", 400));
    }
    // check if the access token is expired
    if (decoded.exp && decoded.exp == Date.now() / 1000) {
        try {
            // await updateAccessToken(req, res, next);
        }
        catch (error) {
            return next(error);
        }
    }
    else {
        const user = await redis_1.redis.get(decoded.id);
        if (!user) {
            return next(new ErrorHandler_1.default("Please login to access this resource", 400));
        }
        req.user = JSON.parse(user); // req.user gives error, to fix create @types/custom.d.ts  --> declare IUser globally
        next();
    }
});
// validate user role
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user?.role || "")) {
            return next(new ErrorHandler_1.default(`Role: ${req.user?.role} is not allowed to access this resource`, 400));
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
