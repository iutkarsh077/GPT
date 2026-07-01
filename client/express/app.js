import "dotenv/config";
import express from "express";
import passport from "passport";
import "./helpers/passport.js";
import route from "./routes/route.js";
import session from "express-session";
import dbConnect from "./helpers/dbConnect.js";
import cors from "cors";
const port = process.env.PORT || 4000;
const app = express();

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret",
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
    resave: false,
    saveUninitialized: false,
  }),
);

app.use(cors({
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH"],
    origin: [process.env.FRONT_END_URI]
}))

app.use(express.json());

app.use(passport.initialize());
app.use(passport.session());
app.use("/", route);
app.use("/api", route);

app.get("/health",(req, res)=>{
  return res.send("Hey everything is fine")
})

dbConnect()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is listening at port ${port}`);
    });
  })
  .catch((error) => {
    console.log("Something went worng while starting server", error);
  });
