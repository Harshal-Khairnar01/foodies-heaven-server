require("dotenv").config();

import express from "express";
export const app = express();

import cors from "cors";
import cookieParser from "cookie-parser";

import { ErrorMiddleware } from "./middleware/error";

import { rateLimit } from "express-rate-limit";

// body parser
app.use(express.json({ limit: "50mb" }));

// cookie parser
app.use(cookieParser());

const allowedOrigins = process.env.ORIGIN
  ? JSON.parse(process.env.ORIGIN)
  : ["http://localhost:3000"];

// cors=> cross origin resource sharing
app.use(
  cors({
    // origin: process.env.ORIGIN,
    origin: allowedOrigins,
    credentials: true,

    // methods: ["GET", "POST", "PUT", "DELETE"], // ✅ Allow required methods
    // allowedHeaders: ["Content-Type", "Authorization"], // ✅ Allow required headers
  })
);

// api request limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: "draft-8", // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  // store: ... , // Redis, Memcached, etc. See below.
});

// routes import
import userRouter from "./routes/user.route";
import recipeRouter from "./routes/recipe.route";
import contactRouter from "./routes/contact.route";

// routes declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/", recipeRouter);
app.use("/api/v1/", contactRouter);

//unknown route
// app.all("*", (req: Request, res: Response, next: NextFunction) => {
//   const err = new Error(`Can't find ${req.originalUrl} on this server`) as any;
//   err.statusCode = 404;
//   next(err);
// });

// middleware calls
app.use(limiter);

app.use(ErrorMiddleware);
