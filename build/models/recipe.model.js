"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = __importDefault(require("./user.model"));
const recipeSchema = new mongoose_1.default.Schema({
    title: {
        type: String,
        required: [true, "Enter title of recipe"],
    },
    description: {
        type: String,
        required: [true, "Enter Description"],
    },
    thumbnail: {
        public_id: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true
        }
    },
    user: Object,
    category: {
        type: String,
        required: [true, "Enter category of recipe"],
    },
    region: {
        type: String,
        required: [true, "Enter region of recipe"],
    },
    type: {
        type: String,
        required: [true, "Enter type of recipe"],
    },
    ingredients: [
        {
            name: String,
            quantity: String
        }
    ],
    recipe: [
        {
            step: { type: String }
        }
    ]
}, {
    timestamps: true,
});
recipeSchema.post("save", async function (doc) {
    const recipe = this;
    const userId = recipe.user._id;
    await user_model_1.default.findByIdAndUpdate(userId, {
        $push: { recipes: { recipeId: recipe._id } },
    }, { new: true });
});
const Recipe = mongoose_1.default.model("Recipe", recipeSchema);
exports.default = Recipe;
