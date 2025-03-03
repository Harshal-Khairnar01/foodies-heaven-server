"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRecipe = void 0;
const recipe_model_1 = __importDefault(require("../models/recipe.model"));
const catchAsyncError_1 = require("../middleware/catchAsyncError");
const redis_1 = require("../utils/redis");
const user_model_1 = __importDefault(require("../models/user.model"));
// create recipe
exports.createRecipe = (0, catchAsyncError_1.CatchAsyncError)(async (data, res, next) => {
    const recipe = await recipe_model_1.default.create(data);
    const user = await user_model_1.default.findById(recipe.user._id);
    await redis_1.redis.set(recipe.user._id, JSON.stringify(user));
    res.status(201).json({
        success: true,
        recipe
    });
});
