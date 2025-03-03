"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserAsChefs = exports.deleteUser = exports.updateUserRole = exports.getAllUsers = exports.updateProfilePicture = exports.updatePassword = exports.updateUserInfo = exports.socialAuth = exports.getUserInfo = exports.updateAccessToken = exports.logoutUSer = exports.loginUser = exports.activateUser = exports.createActivationToken = exports.register = void 0;
require("dotenv").config();
const user_model_1 = __importDefault(require("../models/user.model"));
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const catchAsyncError_1 = require("../middleware/catchAsyncError");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const sendMail_1 = __importDefault(require("../utils/sendMail"));
const jwt_1 = require("../utils/jwt");
const redis_1 = require("../utils/redis");
const user_service_1 = require("../services/user.service");
const cloudinary_1 = __importDefault(require("cloudinary"));
const recipe_model_1 = __importDefault(require("../models/recipe.model"));
exports.register = (0, catchAsyncError_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        // console.log(name, email, password);
        if ([username, email, password].some((field) => field?.trim() === "")) {
            return next(new ErrorHandler_1.default("All fileds are required!", 400));
        }
        const isEmailExists = await user_model_1.default.findOne({ email });
        if (isEmailExists) {
            return next(new ErrorHandler_1.default("Email already exists", 400));
        }
        const user = {
            username,
            email,
            password,
        };
        const activationToken = (0, exports.createActivationToken)(user);
        const activationCode = activationToken.activationCode;
        const data = { user: { name: user.username }, activationCode };
        // const html = await ejs.renderFile(
        //   path.join(__dirname, "../mails/activation-mail.ejs"),
        //   data
        // );
        try {
            await (0, sendMail_1.default)({
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
        }
        catch (error) {
            return next(new ErrorHandler_1.default(error.message, 400));
        }
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
const createActivationToken = (user) => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const token = jsonwebtoken_1.default.sign({
        user,
        activationCode,
    }, process.env.ACTIVATION_SECRET, // import secret from jsonwebtoken
    { expiresIn: "5m" });
    return { token, activationCode };
};
exports.createActivationToken = createActivationToken;
exports.activateUser = (0, catchAsyncError_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { activation_code, activation_token } = req.body;
        const newUser = jsonwebtoken_1.default.verify(activation_token, process.env.ACTIVATION_SECRET);
        if (newUser.activationCode !== activation_code) {
            return next(new ErrorHandler_1.default("Invalid activation code", 400));
        }
        const { username, email, password } = newUser.user;
        const existUser = await user_model_1.default.findOne({ email });
        if (existUser) {
            return next(new ErrorHandler_1.default("Email already exist", 400));
        }
        const user = await user_model_1.default.create({
            username,
            email,
            password,
        });
        res.status(201).json({
            success: true,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
exports.loginUser = (0, catchAsyncError_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { email, password } = req.body;
        // console.log(email,password)
        if (!email || !password) {
            return next(new ErrorHandler_1.default("Please enter email and password!", 400));
        }
        const user = await user_model_1.default.findOne({ email }).select("+password");
        // console.log(user)
        if (!user) {
            return next(new ErrorHandler_1.default("Invalid email or password!", 400));
        }
        const isPasswordMatch = await user.comparePassword(password);
        // console.log(isPasswordMatch)
        if (!isPasswordMatch) {
            return next(new ErrorHandler_1.default("Invalid Password!", 400));
        }
        (0, jwt_1.sendToken)(user, 200, res);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
//logout user
exports.logoutUSer = (0, catchAsyncError_1.CatchAsyncError)(async (req, res, next) => {
    try {
        res.cookie("accessToken", "", { maxAge: 1 });
        res.cookie("refreshToken", "", { maxAge: 1 });
        const userId = req.user?._id || "";
        redis_1.redis.del(userId);
        res.status(200).json({
            success: true,
            message: "Logged Out Successfully!",
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// update access Token
exports.updateAccessToken = (0, catchAsyncError_1.CatchAsyncError)(async (req, res, next) => {
    try {
        // console.log(req.cookies);
        const refreshToken = req.cookies.refreshToken;
        const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const message = "Could not refresh token";
        if (!decoded) {
            return next(new ErrorHandler_1.default(message, 400));
        }
        // const user=await User.findById(decoded.id);
        const session = await redis_1.redis.get(decoded.id);
        if (!session) {
            return next(new ErrorHandler_1.default("Please login to access this resources!", 400));
        }
        const user = JSON.parse(session);
        const accsessToken = jsonwebtoken_1.default.sign({ id: user._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "5m" });
        const newRefreshToken = jsonwebtoken_1.default.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "3d" });
        req.user = user;
        res.cookie("accessToken", accsessToken, jwt_1.accessTokenOptions);
        res.cookie("refreshToken", newRefreshToken, jwt_1.refreshTokenOptions);
        await redis_1.redis.set(user._id, JSON.stringify(user), "EX", 604800); // 7 days
        // next();
        res.status(200).json({
            success: true,
            accsessToken,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// get user info
exports.getUserInfo = (0, catchAsyncError_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const userId = req.user?._id;
        (0, user_service_1.getUserById)(userId, res);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// social auth
exports.socialAuth = (0, catchAsyncError_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { email, username, avatar } = req.body;
        const user = await user_model_1.default.findOne({ email });
        if (!user) {
            const newUser = await user_model_1.default.create({ email, username, avatar });
            (0, jwt_1.sendToken)(newUser, 200, res);
        }
        else {
            (0, jwt_1.sendToken)(user, 200, res);
        }
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
exports.updateUserInfo = (0, catchAsyncError_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { email, username } = req.body;
        // console.log(email, name);
        const userId = req.user?._id;
        const user = await user_model_1.default.findById(userId);
        // console.log(user);
        if (email && user) {
            const isEmailExists = await user_model_1.default.findOne({ email });
            if (isEmailExists) {
                return next(new ErrorHandler_1.default("Email already exists!", 400));
            }
            user.email = email;
        }
        if (username && user) {
            user.username = username;
        }
        await user?.save();
        await redis_1.redis.set(userId, JSON.stringify(user));
        // Update the recipes associated with the user
        // Here we update the user information inside the recipes collection
        await recipe_model_1.default.updateMany({ "user._id": userId }, // Matching recipes where the user's _id is stored in the 'user' field
        {
            $set: {
                "user.username": user?.username,
                "user.email": user?.email
            }
        });
        // Clear the cache for the recipes associated with this user
        const userRecipes = await recipe_model_1.default.find({ "user._id": userId });
        userRecipes.forEach(async (recipe) => {
            const recipeId = recipe._id; // Type assertion here
            await redis_1.redis.del(recipeId); // Now `recipeId` is a valid string
        });
        res.status(201).json({
            success: true,
            user,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
exports.updatePassword = (0, catchAsyncError_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return next(new ErrorHandler_1.default("Please enter old and new password!", 400));
        }
        const user = await user_model_1.default.findById(req.user?._id).select("+password");
        if (user?.password === undefined) {
            return next(new ErrorHandler_1.default("Invalid User", 400));
        }
        const isPasswordMatch = await user?.comparePassword(oldPassword);
        if (!isPasswordMatch) {
            return next(new ErrorHandler_1.default("Old Password is Invalid", 400));
        }
        user.password = newPassword;
        await user.save();
        await redis_1.redis.set(user.id, JSON.stringify(user));
        res.status(201).json({
            success: true,
            user,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
exports.updateProfilePicture = (0, catchAsyncError_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { avatar } = req.body;
        // console.log(avatar);
        const userId = req?.user?._id;
        const user = await user_model_1.default.findById(userId);
        // console.log(user, "test");
        if (avatar && user) {
            if (user?.avatar?.public_id) {
                // first delete the old image
                await cloudinary_1.default.v2.uploader.destroy(user?.avatar?.public_id);
                const myCloud = await cloudinary_1.default.v2.uploader.upload(avatar, {
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
            }
            else {
                const myCloud = await cloudinary_1.default.v2.uploader.upload(avatar, {
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
        await redis_1.redis.set(userId, JSON.stringify(updatedUser));
        // Update the avatar in the recipes associated with this user
        await recipe_model_1.default.updateMany({ "user._id": userId }, { $set: { "user.avatar": updatedUser?.avatar } });
        // Clear the cache for the recipes associated with this user
        const userRecipes = await recipe_model_1.default.find({ "user._id": userId });
        userRecipes.forEach(async (recipe) => {
            const recipeId = recipe._id; // Type assertion here
            await redis_1.redis.del(recipeId); // Now `recipeId` is a valid string
        });
        res.status(200).json({
            success: true,
            user,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// get all users -- only for admin
exports.getAllUsers = (0, catchAsyncError_1.CatchAsyncError)(async (req, res, next) => {
    try {
        (0, user_service_1.getAllUserService)(req, res);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// update user role --- only for admin
exports.updateUserRole = (0, catchAsyncError_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { role, email } = req.body;
        const isUserEXist = await user_model_1.default.findOne({ email });
        if (isUserEXist) {
            (0, user_service_1.updateUserRoleService)(res, email, role);
        }
        else {
            return res.status(400).json({
                success: false,
                message: "User not found!",
            });
        }
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// Delete user --- only for admin
exports.deleteUser = (0, catchAsyncError_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await user_model_1.default.findById(id);
        if (!user) {
            return next(new ErrorHandler_1.default("User not found!", 404));
        }
        await user_model_1.default.findByIdAndDelete(id);
        await redis_1.redis.del(id);
        res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// get user as chefs
exports.getUserAsChefs = (0, catchAsyncError_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const user = await user_model_1.default.aggregate([
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
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
