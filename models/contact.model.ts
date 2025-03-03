import mongoose, { Document, Model, Schema } from "mongoose";

export interface IContact extends Document {
    name: string;
    email: string;
    phone: number;
    message: string;
    createdAt: Date;
  }

  const contactSchema: Schema<IContact> = new mongoose.Schema(
    {
      name: {
        type: String,
        required: [true, "Enter your name"],
        trim: true,
      },
      email: {
        type: String,
        required: [true, "Enter your email"],
        trim: true,
      },
      phone: {
        type: Number,
        required: [true, "Enter your phone number"],
      },
      message: {
        type: String,
        required: [true, "Enter your message"],
        trim: true,
      },
    },
    {
      timestamps: true,
    }
  );

  const Contact: Model<IContact> = mongoose.model("Contact", contactSchema);

export default Contact;