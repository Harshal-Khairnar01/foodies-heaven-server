"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const recipe_controller_1 = require("../controllers/recipe.controller");
const recipeRouter = express_1.default.Router();
recipeRouter.post("/add-recipe", auth_1.isAuthenticated, recipe_controller_1.uploadRecipe);
recipeRouter.put("/edit-recipe/:id", auth_1.isAuthenticated, recipe_controller_1.editRecipe);
recipeRouter.get("/get-recipe/:id", recipe_controller_1.getSingleRecipe);
recipeRouter.get("/get-recipes", recipe_controller_1.getAllRecipes);
recipeRouter.get("/get-recipes-user", auth_1.isAuthenticated, recipe_controller_1.getRecipeByUser);
recipeRouter.get("/recipe/:category", recipe_controller_1.getRecipeByCategory);
recipeRouter.delete("/delete-recipe/:id", auth_1.isAuthenticated, recipe_controller_1.deleteRecipe);
exports.default = recipeRouter;
