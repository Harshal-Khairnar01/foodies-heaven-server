import { Request, Response, NextFunction } from "express";

import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import cloudinary from "cloudinary";
import { createRecipe } from "../services/recipe.service";
import Recipe from "../models/recipe.model";
import { redis } from "../utils/redis";

// upload recipe
export const uploadRecipe = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      data.user = req.user;
      console.log(data);

      const thumbnail = data.thumbnail;
      if (thumbnail) {
        const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
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

      await createRecipe(data, res, next);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// edit Recipe
export const editRecipe = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      console.log(data);
      const thumbnail = data.thumbnail;

      const RecipeId = req.params.id;
      const courseData = (await Recipe.findById(RecipeId)) as any;

      console.log(thumbnail);
      if (thumbnail.startsWith("https")) {
        data.thumbnail = {
          public_id: courseData?.thumbnail.public_id,
          url: courseData?.thumbnail.url,
        };
      }
      if (thumbnail && !thumbnail.startsWith("https")) {
        await cloudinary.v2.uploader.destroy(courseData?.thumbnail?.pubic_id);
        const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "recipes",
        });

        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }

      const recipe = await Recipe.findByIdAndUpdate(
        RecipeId,
        {
          $set: data,
        },
        { new: true }
      );
      return res.status(201).json({
        success: true,
        recipe,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// get single Recipe
export const getSingleRecipe = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recipeId = req.params.id;

      const isCacheExist = await redis.get(recipeId);

      if (isCacheExist) {
        const recipe = JSON.parse(isCacheExist);
        return res.status(200).json({
          success: true,
          recipe,
        });
      } else {
        const recipe = await Recipe.findById(recipeId);

        await redis.set(recipeId, JSON.stringify(recipe), "EX", 604800); // 7 days

        return res.status(200).json({
          success: true,
          recipe,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// get All Recipes
export const getAllRecipes = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { recipe, page } = req.query; // Extract query parameters
      const regex = new RegExp(recipe as string, "i"); // Create a regex for search
      const ITEM_PER_PAGE = Number(process.env.PAGE_ITEM_AT_RECIPE_PAGE) || 3; // Default items per page

      // Fetch total count of matching recipes
      const count = await Recipe.find({
        $or: [
          { title: { $regex: regex } },
          { category: { $regex: regex } },
          { type: { $regex: regex } },
        ],
      }).countDocuments();

      // Fetch paginated recipes
      const recipes = await Recipe.find({
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
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Delete Recipe
export const deleteRecipe = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const recipe = await Recipe.findById(id);
      if (!recipe) {
        return next(new ErrorHandler("Recipe not found!", 404));
      }
      await Recipe.findByIdAndDelete(id);
      await redis.del(id);

      res.status(200).json({
        success: true,
        message: "recipe deleted successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// get recipe by user
export const getRecipeByUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id;

      const { recipe, page } = req.query; // Extract query parameters
      const regex = new RegExp(recipe as string, "i");
      const ITEM_PER_PAGE = process.env.PAGE_ITEM_AT_ACCOUNT_PAGE || 3;

      const count = await Recipe.find({
        $and: [{ title: { $regex: regex } }, { "user._id": userId }],
      }).countDocuments();

      const recipes = await Recipe.find({
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
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const getRecipeByCategory = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { category } = req.params;
      console.log(category);
      const recipes = await Recipe.find({ category: category.toString() });
      return res.status(200).json({
        success: true,
        recipes,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
