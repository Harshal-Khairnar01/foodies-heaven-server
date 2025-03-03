import { Response, Request } from "express";

import { redis } from "../utils/redis";
import User from "../models/user.model";

// get user by id
export const getUserById = async (id: string, res: Response) => {
  // const user=await User.findById(id);
  const userJson = await redis.get(id);
  if (userJson) {
    const user = JSON.parse(userJson);
    res.status(201).json({
      success: true,
      user,
    });
  }
};

// get all users
export const getAllUserService = async (req: Request, res: Response) => {
  const { user = "", page = 1 } = req.query; // Extract query parameters
  const regex = new RegExp(user as string, "i");
  const ITEM_PER_PAGE = process.env.PAGE_ITEM_AT_USER_PAGE;

  const count = await User.find({
    $or: [{ username: { $regex: regex } }, { email: { $regex: regex } }],
  }).countDocuments();
  const users = await User.find({
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

// update user role
export const updateUserRoleService = async (
  res: Response,
  email: string,
  role: string
) => {
  const user = await User.findOneAndUpdate({ email }, { role }, { new: true });

  res.status(201).json({
    success: true,
    user,
  });
};
