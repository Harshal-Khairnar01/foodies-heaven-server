import { NextFunction, Response } from "express";
import Recipe from "../models/recipe.model";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import { redis } from "../utils/redis";
import User from "../models/user.model";
import { RedisKey } from "ioredis";

// create recipe
export const createRecipe = CatchAsyncError(
  async ( data: any, res: Response,next:NextFunction) => {
    const recipe=await Recipe.create(data);
    const user=await User.findById(recipe.user._id);
    await redis.set(recipe.user._id as RedisKey, JSON.stringify(user) as any);
  
    res.status(201).json({
        success:true,
        recipe
    })
  }
);

