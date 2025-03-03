import express from "express";

import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  deleteRecipe,
  editRecipe,
  getAllRecipes,
  getRecipeByCategory,
  getRecipeByUser,
  getSingleRecipe,
  uploadRecipe,
} from "../controllers/recipe.controller";
const recipeRouter = express.Router();

recipeRouter.post("/add-recipe", isAuthenticated, uploadRecipe);
recipeRouter.put("/edit-recipe/:id", isAuthenticated, editRecipe);

recipeRouter.get("/get-recipe/:id", getSingleRecipe);
recipeRouter.get("/get-recipes", getAllRecipes);
recipeRouter.get("/get-recipes-user", isAuthenticated, getRecipeByUser);
recipeRouter.get("/recipe/:category", getRecipeByCategory);
recipeRouter.delete("/delete-recipe/:id", isAuthenticated, deleteRecipe);

export default recipeRouter;
