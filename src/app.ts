import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import httpLogger from "./shared/logger/httpLogger.js";
import errorHandler from "./shared/errors/errorHandler.js";
import swaggerUi from "swagger-ui-express";
import authRoutes from "./modules/auth/authRoutes.js";
import swaggerSpec from "./config/swagger.js";
import restaurantRoutes, {
  partnerRouter as partnerRestaurantRoutes,
} from "./modules/restaurant/restaurantRoutes.js";
import menuPublicRoutes, {
  partnerRouter as partnerMenuRoutes,
} from "./modules/menu/menuRoutes.js";
import mediaRoutes, {
  partnerPhotoRouter as partnerPhotoRoutes,
} from "./modules/media/mediaRoutes.js";
import orderRoutes, {
  partnerRouter as partnerOrderRoutes,
} from "./modules/order/orderRoutes.js";
import reservationRoutes, {
  partnerRouter as partnerReservationRoutes,
} from "./modules/reservation/reservationRoutes.js";
import driverRoutes, {
  taxiRequestRouter as taxiRequestRoutes,
  partnerTaxiRequestRouter as partnerTaxiRequestRoutes,
  partnerDriverRouter as partnerDriverRoutes,
} from "./modules/taxi/taxiRoutes.js";
import languageRoutes, {
  translationRouter as translationRoutes,
  adminTranslationRouter as adminTranslationRoutes,
} from "./modules/language/languageRoutes.js";
import eventRoutes from "./modules/event/eventRoutes.js";
import vibeRoutes from "./modules/vibe/vibeRoutes.js";
import { getUploadDir } from "./modules/media/mediaStorage.js";
const app: Application = express();
app.use(httpLogger);
app.use(
  "/uploads",
  (_req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  },
  express.static(getUploadDir(), { dotfiles: "deny", index: false }),
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  }),
);
const swaggerCustomCss = `
  body {
    background-color: #0000;
  }
  .swagger-ui {
    filter: invert(88%) hue-rotate(180deg);
  }
  .swagger-ui .microlight {
    filter: invert(100%) hue-rotate(180deg);
  }
  .swagger-ui .topbar {
    display: none;
  }
  .swagger-ui .btn.authorize {
    border-color: #6366f1;
    color: #6366f1;
  }
  .swagger-ui .btn.authorize svg {
    fill: #6366f1;
  }
  .swagger-ui .opblock-tag {
    border-bottom: 1px solid #6366f1;
  }
  .swagger-ui .opblock.opblock-post {
    border-color: #6366f1;
    background: #000000;
  }
  .swagger-ui .opblock.opblock-post .opblock-summary-method {
    background-color: #6366f1;
  }
  .swagger-ui .opblock.opblock-get .opblock-summary-method {
    background-color: #6366f1;
    filter: brightness(1.3);
  }
  .swagger-ui .scheme-container {
    background-color: #000000;
    box-shadow: none;
  }
`;
// app.use(xss());

app.use(
  cors({
    origin: ["http://localhost:3000", "http://192.168.0.105:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "10kb" }));
app.use(helmet());
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: swaggerCustomCss,
    customSiteTitle: "Express API Docs",
  }),
);

app.get("/api-docs", (req, res) => {
  res.redirect("/api-docs/");
});
app.get("/", (req: Request, res: Response) => {
  res.send("right think");
});

app.use("/api/auth", authRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/restaurants", menuPublicRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/partner/restaurant/photos", partnerPhotoRoutes);
app.use("/api/partner/restaurant", partnerRestaurantRoutes);
app.use("/api/partner/menu", partnerMenuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/partner/orders", partnerOrderRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/partner/reservations", partnerReservationRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/taxi-requests", taxiRequestRoutes);
app.use("/api/partner/taxi-requests", partnerTaxiRequestRoutes);
app.use("/api/partner/drivers", partnerDriverRoutes);
app.use("/api/languages", languageRoutes);
app.use("/api/translations", translationRoutes);
app.use("/api/admin/translations", adminTranslationRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/vibes", vibeRoutes);
app.use(errorHandler);

export default app;
