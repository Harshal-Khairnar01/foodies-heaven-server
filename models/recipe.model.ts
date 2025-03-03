import mongoose, { Document, Model, Schema } from "mongoose";
import User, { IUser } from "./user.model";

export interface IRecipe extends Document {
  title: string;
  description: string;
  thumbnail: {
    public_id: string;
    url: string;
  };
  user: IUser;
  category: string;
  region: string;
  type: string;
  ingredients: Array<{ name: string; quantity: string }>;
  recipe: Array<{ step: string }>;
}

const recipeSchema: Schema<IRecipe> = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Enter title of recipe"],
    },
    description: {
      type: String,
      required: [true, "Enter Description"],
    },
    thumbnail: {
      public_id:{
        type:String,
        required:true
      },
      url:{
        type:String,
        required:true
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
    ingredients:[
        {
            name:String,
            quantity:String
        }
    ],
    recipe:[
        {
            step:{type:String}
        }
    ]
  },
  {
    timestamps: true,
  }
);

recipeSchema.post("save", async function (doc) {
  const recipe = this;
  const userId = recipe.user._id;

  await User.findByIdAndUpdate(
    userId,
    {
      $push: { recipes: { recipeId: recipe._id } },
    },
    { new: true }
  );
});

const Recipe: Model<IRecipe> = mongoose.model("Recipe", recipeSchema);
export default Recipe;
