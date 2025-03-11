"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
require("dotenv").config();
const express_1 = __importDefault(require("express"));
exports.app = (0, express_1.default)();
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const error_1 = require("./middleware/error");
const express_rate_limit_1 = require("express-rate-limit");
// body parser
exports.app.use(express_1.default.json({ limit: "50mb" }));
// cookie parser
exports.app.use((0, cookie_parser_1.default)());
const allowedOrigins = process.env.ORIGIN
    ? JSON.parse(process.env.ORIGIN)
    : ["http://localhost:3000"];
// cors=> cross origin resource sharing
exports.app.use((0, cors_1.default)({
    // origin: process.env.ORIGIN,
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"], // ✅ Allow required methods
    allowedHeaders: ["Content-Type", "Authorization"], // ✅ Allow required headers
}));
// api request limit
const limiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
    standardHeaders: "draft-8", // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    // store: ... , // Redis, Memcached, etc. See below.
});
// routes import
const user_route_1 = __importDefault(require("./routes/user.route"));
const recipe_route_1 = __importDefault(require("./routes/recipe.route"));
const contact_route_1 = __importDefault(require("./routes/contact.route"));
// routes declaration
exports.app.use("/api/v1/users", user_route_1.default);
exports.app.use("/api/v1/", recipe_route_1.default);
exports.app.use("/api/v1/", contact_route_1.default);
// middleware calls
exports.app.use(limiter);
exports.app.use(error_1.ErrorMiddleware);
