"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserRoleService = exports.getAllUserService = exports.getUserById = void 0;
const redis_1 = require("../utils/redis");
const user_model_1 = __importDefault(require("../models/user.model"));
// get user by id
const getUserById = async (id, res) => {
    // const user=await User.findById(id);
    const userJson = await redis_1.redis.get(id);
    if (userJson) {
        const user = JSON.parse(userJson);
        res.status(201).json({
            success: true,
            user,
        });
    }
};
exports.getUserById = getUserById;
// get all users
const getAllUserService = async (req, res) => {
    const { user = "", page = 1 } = req.query; // Extract query parameters
    const regex = new RegExp(user, "i");
    const ITEM_PER_PAGE = process.env.PAGE_ITEM_AT_USER_PAGE;
    const count = await user_model_1.default.find({
        $or: [{ username: { $regex: regex } }, { email: { $regex: regex } }],
    }).countDocuments();
    const users = await user_model_1.default.find({
        $or: [{ username: { $regex: regex } }, { email: { $regex: regex } }],
    })
        .sort({ createdAt: -1 })
        .limit(Number(ITEM_PER_PAGE))
        .skip(Number(ITEM_PER_PAGE) * (Number(page) - 1));
    res.status(201).json({
        success: true,
        count,
        users,
    });
};
exports.getAllUserService = getAllUserService;
// update user role
const updateUserRoleService = async (res, email, role) => {
    const user = await user_model_1.default.findOneAndUpdate({ email }, { role }, { new: true });
    res.status(201).json({
        success: true,
        user,
    });
};
exports.updateUserRoleService = updateUserRoleService;
