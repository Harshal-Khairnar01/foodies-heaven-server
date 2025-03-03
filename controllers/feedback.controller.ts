import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import ErrorHandler from "../utils/ErrorHandler";
import sendMail from "../utils/sendMail";
import Contact from "../models/contact.model";

interface contactBody {
  name: string;
  email: string;
  phone: number;
  message: string;
}

export const contact = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, phone, message } = req.body;
      console.log(req.body)
      if ([name, email, phone, message].some((field) => typeof field === "string" && field.trim() === "")) {
        return next(new ErrorHandler("All fileds are required!", 400));
      }

      const data: contactBody = {
        name,
        email,
        phone,
        message,
      };

      // Save in database
      const newContact = await Contact.create(data);

      // Send confirmation mail

      await sendMail({
        email: data.email,
        subject: "Your query reached successfully!",
        template: "contact-mail.ejs",
        data,
      });
      return res.status(201).json({
        success: true,
        message: "Your message has been sent successfully!",
        data: newContact,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
