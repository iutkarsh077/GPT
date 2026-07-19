import "dotenv/config";
import express from "express";
import http from "http";
import passport from "passport";
import "./helpers/passport.js";
import route from "./routes/route.js";
import session from "express-session";
import MongoStore from "connect-mongo";
import dbConnect from "./helpers/dbConnect.js";
import cors from "cors";
import { initSocket } from "./helpers/socket.js";

const port = process.env.PORT || 4000;
const app = express();
const httpServer = http.createServer(app);
const sessionMaxAgeMs = 30 * 24 * 60 * 60 * 1000;

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: "sessions",
    ttl: sessionMaxAgeMs / 1000,
  }),
  cookie: {
    maxAge: sessionMaxAgeMs,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
});

app.use(sessionMiddleware);

app.use(
  cors({
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH"],
    origin: [process.env.FRONT_END_URI],
  }),
);

app.use(express.json());

app.use(passport.initialize());
app.use(passport.session());
app.use("/", route);
app.use("/api", route);

app.get("/health", (req, res) => {
  return res.send("Hey everything is fine");
});

initSocket(httpServer, sessionMiddleware);

dbConnect()
  .then(() => {
    httpServer.listen(port, () => {
      console.log(`Server is listening at port ${port}`);
    });
  })
  .catch((error) => {
    console.log("Something went worng while starting server", error);
  });
