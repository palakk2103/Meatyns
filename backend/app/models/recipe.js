import mongoose from "mongoose";

const recipeIngredientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 0.01,
    },
    unit: {
      type: String,
      default: "pack",
      trim: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
      index: true,
    },
    isOptional: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const recipeInstructionSchema = new mongoose.Schema(
  {
    step: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const recipeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    prepTimeMinutes: {
      type: Number,
      default: 15,
      min: 0,
    },
    cookTimeMinutes: {
      type: Number,
      default: 30,
      min: 0,
    },
    servings: {
      type: Number,
      default: 4,
      min: 1,
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard", "Chef Special"],
      default: "Medium",
    },
    cuisine: {
      type: String,
      default: "Indian",
      trim: true,
    },
    category: {
      type: String,
      default: "Mutton", // Chicken, Mutton, Fish, Marinades, Curries
      trim: true,
    },
    ingredients: [recipeIngredientSchema],
    instructions: [recipeInstructionSchema],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { timestamps: true }
);

recipeSchema.index({ status: 1, isFeatured: 1, createdAt: -1 });
recipeSchema.index({ title: "text", description: "text", tags: "text" });

export default mongoose.model("Recipe", recipeSchema);
