import express from "express";
import { contact } from "../controllers/feedback.controller";

const contactRouter = express.Router();

contactRouter.post("/contact", contact);
export default contactRouter;
