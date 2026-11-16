import fs from "fs";
import yaml from "yaml";
import pkg from "pg";

try {
  const file = fs.readFileSync('./env.yaml', 'utf8');
  const envConfig = yaml.parse(file);
  
  // Assign YAML key-values to process.env
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
} catch (err) {
  console.error('Failed to load env.yaml:', err);
}

import express from "express";
import axios from "axios";
import cors from "cors";
import rateLimiter from "express-rate-limit";
import { createOrdersAndPaymentsTable} from "./models/db_helper.js";



import { createOrderRouter, getOrdersRouter, handleSafaricomCallbackRouter, processSTKPushTriggerRouter, updateOrderStatusRouter } from "./router.js";

const app = express();
const PORT = process.env.PORT || 8080;
const createRateLimiter = rateLimiter({

     windowMs : 60 * 30 * 1000,
     max : 20,
     message : { error : "Chill with the orders "}
});

const { Pool} = pkg;
const pool = new Pool({

    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }

});

app.set("trust proxy", 1);//*//


app.use(express.json());
app.use(cors());


function requireKey(req, res, next) {
  const key = req.headers["tenet-admin-key"]; 
  
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: "Take A Step Back : ADMIN ONLY🛑" });
  }
  next();
}

createOrdersAndPaymentsTable();

app.get("/health", (req, res) => {

  res.status(200).send("OK");

});

app.use("/admin-TENET",requireKey,getOrdersRouter());
app.use("/orders",createRateLimiter,createOrderRouter());
app.use("/admin-TENET",requireKey,updateOrderStatusRouter());
app.use("/pay",processSTKPushTriggerRouter());
app.use("/callback",handleSafaricomCallbackRouter());

app.listen(PORT, "0.0.0.0",() => {
  console.log(`Server running on port ${PORT}`);
});