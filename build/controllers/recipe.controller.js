"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecipeByCategory = exports.getRecipeByUser = exports.deleteRecipe = exports.getAllRecipes = exports.getSingleRecipe = exports.editRecipe = exports.uploadRecipe = void 0;
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const catchAsyncError_1 = require("../middleware/catchAsyncError");
const cloudinary_1 = __importDefault(require("cloudinary"));
const recipe_service_1 = require("../services/recipe.service");
const recipe_model_1 = __importDefault(require("../models/recipe.model"));
const redis_1 = require("../utils/redis");
// upload recipe
exports.uploadRecipe = (0, catchAsyncError_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const data = req.body;
        data.user = req.user;
        console.log(data);
        const thumbnail = data.thumbnail;
        if (thumbnail) {
            const myCloud = await cloudinary_1.default.v2.uploader.upload(thumbnail, {
                folder: "recipes",
            });
            // data.thumbnail.url = myCloud.secure_url;
            // data.thumbnail.public_id = myCloud.public_id;
            data.thumbnail = {
                url: myCloud.secure_url,
                public_id: myCloud.public_id,
            };
        }
        console.log(data);
        await (0, recipe_service_1.createRecipe)(data, res, next);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// edit Recipe
exports.editRecipe = (0, catchAsyncError_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const data = req.body;
        console.log(data);
        const thumbnail = data.thumbnail;
        const RecipeId = req.params.id;
        const courseData = (await recipe_model_1.default.findById(RecipeId));
        console.log(thumbnail);
        if (thumbnail.startsWith("https")) {
            data.thumbnail = {
                public_id: courseData?.thumbnail.public_id,
                url: courseData?.thumbnail.url,
            };
        }
        if (thumbnail && !thumbnail.startsWith("https")) {
            await cloudinary_1.default.v2.uploader.destroy(courseData?.thumbnail?.pubic_id);
            const myCloud = await cloudinary_1.default.v2.uploader.upload(thumbnail, {
                folder: "recipes",
            });
            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url,
            };
        }
        const recipe = await recipe_model_1.default.findByIdAndUpdate(RecipeId, {
            $set: data,
        }, { new: true });
        return res.status(201).json({
            success: true,
            recipe,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// get single Recipe
exports.getSingleRecipe = (0, catchAsyncError_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const recipeId = req.params.id;
        const isCacheExist = await redis_1.redis.get(recipeId);
        if (isCacheExist) {
            const recipe = JSON.parse(isCacheExist);
            return res.status(200).json({
                success: true,
                recipe,
            });
        }
        else {
            const recipe = await recipe_model_1.default.findById(recipeId);
            await redis_1.redis.set(recipeId, JSON.stringify(recipe), "EX", 604800); // 7 days
            return res.status(200).json({
                success: true,
                recipe,
            });
        }
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// get All Recipes
exports.getAllRecipes = (0, catchAsyncError_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { recipe, page } = req.query; // Extract query parameters
        const regex = new RegExp(recipe, "i"); // Create a regex for search
        const ITEM_PER_PAGE = Number(process.env.PAGE_ITEM_AT_RECIPE_PAGE) || 3; // Default items per page
        // Fetch total count of matching recipes
        const count = await recipe_model_1.default.find({
            $or: [
                { title: { $regex: regex } },
                { category: { $regex: regex } },
                { type: { $regex: regex } },
            ],
        }).countDocuments();
        // Fetch paginated recipes
        const recipes = await recipe_model_1.default.find({
            $or: [
                { title: { $regex: regex } },
                { category: { $regex: regex } },
                { type: { $regex: regex } },
            ],
        })
            .limit(ITEM_PER_PAGE)
            .skip(ITEM_PER_PAGE * (Number(page) - 1)); // when we search page always 1
        // Respond with results
        return res.status(200).json({
            success: true,
            count,
            recipes,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// Delete Recipe
exports.deleteRecipe = (0, catchAsyncError_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { id } = req.params;
        const recipe = await recipe_model_1.default.findById(id);
        if (!recipe) {
            return next(new ErrorHandler_1.default("Recipe not found!", 404));
        }
        await recipe_model_1.default.findByIdAndDelete(id);
        await redis_1.redis.del(id);
        res.status(200).json({
            success: true,
            message: "recipe deleted successfully",
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// get recipe by user
exports.getRecipeByUser = (0, catchAsyncError_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const userId = req.user?._id;
        const { recipe, page } = req.query; // Extract query parameters
        const regex = new RegExp(recipe, "i");
        const ITEM_PER_PAGE = process.env.PAGE_ITEM_AT_ACCOUNT_PAGE || 3;
        const count = await recipe_model_1.default.find({
            $and: [{ title: { $regex: regex } }, { "user._id": userId }],
        }).countDocuments();
        const recipes = await recipe_model_1.default.find({
            $and: [{ title: { $regex: regex } }, { "user._id": userId }],
        })
            .limit(Number(ITEM_PER_PAGE))
            .skip(Number(ITEM_PER_PAGE) * (Number(page) - 1));
        // console.log(recipes)
        // Respond with results
        return res.status(200).json({
            success: true,
            count,
            recipes,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
exports.getRecipeByCategory = (0, catchAsyncError_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { category } = req.params;
        console.log(category);
        const recipes = await recipe_model_1.default.find({ category: category.toString() });
        return res.status(200).json({
            success: true,
            recipes,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
