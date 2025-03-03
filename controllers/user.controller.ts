require("dotenv").config();

import { Request, Response, NextFunction } from "express";
import User, { IUser } from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncError";

import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import sendMail from "../utils/sendMail";
import {
  accessTokenOptions,
  refreshTokenOptions,
  sendToken,
} from "../utils/jwt";
import { redis } from "../utils/redis";
import {
  getAllUserService,
  getUserById,
  updateUserRoleService,
} from "../services/user.service";
import cloudinary from "cloudinary";
import Recipe from "../models/recipe.model";
import { RedisKey } from "ioredis";

// register user
interface RegistrationBody {
  username: string;
  email: string;
  password: string;
  avatar?: string;
}

export const register = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, email, password } = req.body;
      // console.log(name, email, password);

      if ([username, email, password].some((field) => field?.trim() === "")) {
        return next(new ErrorHandler("All fileds are required!", 400));
      }

      const isEmailExists = await User.findOne({ email });
      if (isEmailExists) {
        return next(new ErrorHandler("Email already exists", 400));
      }

      const user: RegistrationBody = {
        username,
        email,
        password,
      };

      const activationToken = createActivationToken(user);

      const activationCode = activationToken.activationCode;
      const data = { user: { name: user.username }, activationCode };

      // const html = await ejs.renderFile(
      //   path.join(__dirname, "../mails/activation-mail.ejs"),
      //   data
      // );

      try {
        await sendMail({
          email: user.email,
          subject: "Activate your account",
          template: "activation-mail.ejs",
          data,
        });

        res.status(201).json({
          success: true,
          message: `Please check ypur email: ${user.email} to activate your account`,
          activationToken: activationToken.token,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface IActivationToken {
  token: string;
  activationCode: string;
}

export const createActivationToken = (user: any): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
  const token = jwt.sign(
    {
      user,
      activationCode,
    },
    process.env.ACTIVATION_SECRET as Secret, // import secret from jsonwebtoken
    { expiresIn: "5m" }
  );
  return { token, activationCode };
};

//activate user
interface IActivationRequest {
  activation_token: string;
  activation_code: string;
}

export const activateUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activation_code, activation_token } =
        req.body as IActivationRequest;

      const newUser: { user: IUser; activationCode: string } = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET as string
      ) as { user: IUser; activationCode: string };

      if (newUser.activationCode !== activation_code) {
        return next(new ErrorHandler("Invalid activation code", 400));
      }

      const { username, email, password } = newUser.user;
      const existUser = await User.findOne({ email });

      if (existUser) {
        return next(new ErrorHandler("Email already exist", 400));
      }
      const user = await User.create({
        username,
        email,
        password,
      });
      res.status(201).json({
        success: true,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// login user
interface ILoginUser {
  email: string;
  password: string;
}

export const loginUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as ILoginUser;
      // console.log(email,password)
      if (!email || !password) {
        return next(new ErrorHandler("Please enter email and password!", 400));
      }
      const user = await User.findOne({ email }).select("+password");
      // console.log(user)
      if (!user) {
        return next(new ErrorHandler("Invalid email or password!", 400));
      }
      const isPasswordMatch = await user.comparePassword(password);
      // console.log(isPasswordMatch)
      if (!isPasswordMatch) {
        return next(new ErrorHandler("Invalid Password!", 400));
      }

      sendToken(user, 200, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//logout user
export const logoutUSer = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie("accessToken", "", { maxAge: 1 });
      res.cookie("refreshToken", "", { maxAge: 1 });
      const userId = req.user?._id || "";
      redis.del(userId as string);
      res.status(200).json({
        success: true,
        message: "Logged Out Successfully!",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// update access Token
export const updateAccessToken = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // console.log(req.cookies);
      const refreshToken = req.cookies.refreshToken as string;
      const decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET as string
      ) as JwtPayload;
      const message = "Could not refresh token";
      if (!decoded) {
        return next(new ErrorHandler(message, 400));
      }
      // const user=await User.findById(decoded.id);
      const session = await redis.get(decoded.id as string);
      if (!session) {
        return next(
          new ErrorHandler("Please login to access this resources!", 400)
        );
      }

      const user = JSON.parse(session);

      const accsessToken = jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN_SECRET as string,
        { expiresIn: "5m" }
      );
      const newRefreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN_SECRET as string,
        { expiresIn: "3d" }
      );

      req.user = user;

      res.cookie("accessToken", accsessToken, accessTokenOptions);
      res.cookie("refreshToken", newRefreshToken, refreshTokenOptions);

      await redis.set(user._id, JSON.stringify(user), "EX", 604800); // 7 days

      // next();
      res.status(200).json({
        success: true,
        accsessToken,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// get user info
export const getUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id;
      getUserById(userId as string, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface ISocialAuthBody {
  email: string;
  username: string;
  avatar: string;
}
// social auth
export const socialAuth = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, username, avatar } = req.body as ISocialAuthBody;
      const user = await User.findOne({ email });
      if (!user) {
        const newUser = await User.create({ email, username, avatar });
        sendToken(newUser, 200, res);
      } else {
        sendToken(user, 200, res);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// update user information
interface IUpdateUserInfo {
  username?: string;
  email?: string;
}

export const updateUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, username } = req.body as IUpdateUserInfo;
      // console.log(email, name);
      const userId = req.user?._id;
      const user = await User.findById(userId);
      // console.log(user);
      if (email && user) {
        const isEmailExists = await User.findOne({ email });
        if (isEmailExists) {
          return next(new ErrorHandler("Email already exists!", 400));
        }
        user.email = email;
      }
      if (username && user) {
        user.username = username;
      }
      await user?.save();
      await redis.set(userId as string, JSON.stringify(user));

      // Update the recipes associated with the user
      // Here we update the user information inside the recipes collection
      await Recipe.updateMany(
        { "user._id": userId },  // Matching recipes where the user's _id is stored in the 'user' field
        { 
          $set: { 
            "user.username": user?.username, 
            "user.email": user?.email 
          }
        }
      );

       // Clear the cache for the recipes associated with this user
       const userRecipes = await Recipe.find({ "user._id": userId });
       userRecipes.forEach(async (recipe) => {
        const recipeId = (recipe._id as string);  // Type assertion here
        await redis.del(recipeId);  // Now `recipeId` is a valid string
       });

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// update user password
interface IUpdatePassword {
  oldPassword: string;
  newPassword: string;
}

export const updatePassword = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword } = req.body as IUpdatePassword;

      if (!oldPassword || !newPassword) {
        return next(
          new ErrorHandler("Please enter old and new password!", 400)
        );
      }

      const user = await User.findById(req.user?._id).select("+password");

      if (user?.password === undefined) {
        return next(new ErrorHandler("Invalid User", 400));
      }
      const isPasswordMatch = await user?.comparePassword(oldPassword);
      if (!isPasswordMatch) {
        return next(new ErrorHandler("Old Password is Invalid", 400));
      }
      user.password = newPassword;

      await user.save();

      await redis.set(user.id, JSON.stringify(user));

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// update profile picture or avatar
interface IUpdateProfilePicture {
  avatar: {
    public_id: string;
    url: string;
  };
}

export const updateProfilePicture = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { avatar } = req.body;
      // console.log(avatar);
      const userId = req?.user?._id;
      const user = await User.findById(userId);

      // console.log(user, "test");

      if (avatar && user) {
        if (user?.avatar?.public_id) {
          // first delete the old image
          await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);
          const myCloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: "avatars",
            width: 250,
          });
          console.log(myCloud);

          user.avatar.url = myCloud.secure_url;
          user.avatar.public_id = myCloud.public_id;
          // user.avatar = {
          //   url: myCloud.secureUrl,
          //   public_id: myCloud.public_id,
          // };
        } else {
          const myCloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: "avatars",
            width: 250,
          });
          // console.log(myCloud);

          user.avatar.url = myCloud.secure_url;
          user.avatar.public_id = myCloud.public_id;
          // user.avatar = {
          //   url: myCloud.secureUrl,
          //   public_id: myCloud.public_id,
          // };
        }
      }

      const updatedUser = await user?.save();
      // console.log(nuser);

      await redis.set(userId as string, JSON.stringify(updatedUser));

      // Update the avatar in the recipes associated with this user
      await Recipe.updateMany(
        { "user._id": userId },
        { $set: { "user.avatar": updatedUser?.avatar } }
      );

       // Clear the cache for the recipes associated with this user
       const userRecipes = await Recipe.find({ "user._id": userId });
       userRecipes.forEach(async (recipe) => {
        const recipeId = (recipe._id as string);  // Type assertion here
        await redis.del(recipeId);  // Now `recipeId` is a valid string
       });



      res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// get all users -- only for admin
export const getAllUsers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllUserService(req, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// update user role --- only for admin
export const updateUserRole = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role, email } = req.body;
      const isUserEXist = await User.findOne({ email });
      if (isUserEXist) {
        updateUserRoleService(res, email, role);
      } else {
        return res.status(400).json({
          success: false,
          message: "User not found!",
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Delete user --- only for admin
export const deleteUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user) {
        return next(new ErrorHandler("User not found!", 404));
      }
      await User.findByIdAndDelete(id);
      await redis.del(id);

      res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// get user as chefs
export const getUserAsChefs = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await User.aggregate([
        { $sample: { size: 4 } },
        {
          $project: {
            _id: 1,
            email: 1,
            username: 1,
            "avatar.url": 1,
          },
        },
      ]);

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
