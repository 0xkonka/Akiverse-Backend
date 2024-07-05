import express from "express";
import mustacheExpress from "mustache-express";
import { info } from "../src/utils";

const app = express();
app.set("views", `${__dirname}/views`);
app.set("view engine", "mustache");
app.engine("mustache", mustacheExpress());

app.get("/", (req, res) => {
  res.render("login", {
    MAGIC_API_KEY: process.env.MAGIC_API_KEY,
  });
});
app.get("/callback", (req, res) => {
  res.render("login", {
    MAGIC_API_KEY: process.env.MAGIC_API_KEY,
  });
});

app.listen(4001, function () {
  info({ msg: "login server start" });
});
