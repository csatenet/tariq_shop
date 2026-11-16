import  { findOrder } from "./db_helper.js";
import pkg from "pg";
import fs from "fs";
import yaml from "yaml";
import axios from "axios";

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

const { Pool } = pkg;

const pool = new Pool({

    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }

});



async function getOauthAccessToken() {
  const url =
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

  const auth = Buffer.from(
    `${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`
  ).toString("base64");

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Basic ${auth}` },
    });

    return response.data.access_token;
  } catch (error) {
    console.error("OAuth Error:", error.response?.data || error.message);
    throw new Error("Failed to generate access token");
  }
}

export async function handleSafaricomCallback(req,res){


    try {
        const stkCallback = req.body.Body.stkCallback;
    
        const resultCode = stkCallback.ResultCode;
        const orderID = stkCallback.AccountReference; // 🔥 KEY FIX
    
        const metadata = stkCallback.CallbackMetadata?.Item || [];
    
        let amount = 0;
        let mpesaReceipt = null;
        let phone = null;
    
        metadata.forEach(item => {
          if (item.Name === "Amount") amount = item.Value;
          if (item.Name === "MpesaReceiptNumber") mpesaReceipt = item.Value;
          if (item.Name === "PhoneNumber") phone = item.Value;
        });
    
        // 🔥 1. FIND EXACT ORDER
       
    
        const order = await findOrder(orderID);
    
        if (!order) {
          console.error("Order not found for callback:", orderID);
          return res.status(400).send("Invalid order");
        }
    
        // 🔥 2. PREVENT DOUBLE PROCESSING
        if (order.status === "paid") {
          return res.status(200).send("Already processed");
        }
    
        // 🔥 3. VALIDATE PAYMENT
        if (resultCode === 0 && order.total === amount) {
    
          await pool.query(
            `INSERT INTO payments (order_id, phone_number, amount, mpesa_receipt, result_code)
             VALUES ($1,$2,$3,$4,$5)`,
            [orderID, phone, amount, mpesaReceipt, resultCode]
          );
    
          await pool.query(
            `UPDATE orders SET status='paid' WHERE order_id=$1`,
            [orderID]
          );
    
        } else {
          await pool.query(
            `UPDATE orders SET status='failed' WHERE order_id=$1`,
            [orderID]
          );
        }
    
        return res.status(200).send("OK");
    
      } catch (err) {
        console.error("Callback ERROR:", err);
        return res.status(500).send("Error");
      }
}

async function stkpush(amount,phoneNumber,orderID){

        
    const token = await getOauthAccessToken();

    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:\.Z]/g, "")
      .slice(0, 14);

    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString("base64");

    // 🔥 3. USE orderID HERE
    const stkData = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: phoneNumber,
      CallBackURL: process.env.CALLBACK_URL,
      AccountReference: orderID.toString(), // 🔥 FIXED
      TransactionDesc: `Order ${orderID}`,
    };

    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      stkData,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
    
    

}




export async function processSTKPushTrigger(req, res) {
    try {
        console.log(req.body);
        const { phoneNumber, amount, orderID } = req.body;
        
        // 1. Validate required fields
        if (!phoneNumber || !amount || !orderID) {
            return res.status(400).json({ 
                success: false,
                message: "Missing fields",
                data: 1
            });
        }

        // 2. Find the order
        
        const order = await findOrder(orderID);
        
        
        if (!order) {
            return res.status(404).json({ 
                success: false,
                message: "Order not found" 
            });
        }
        
        
        // 3. Verify order amount matches
        if ( Number(order.total) !== amount) {
            return res.status(400).json({ 
                success: false,
                message: "Order amount mismatch",
                data: 2
            });
        }

        
        const response = await stkpush(amount,phoneNumber,orderID);

       
        if (response) {
            return res.status(200).json({
                success: true,
                message: "STK Push Triggered Successfully, waiting for customer to enter PIN",
                data: response
            });
        } else {
            return res.status(500).json({
                success: false,
                message: "Failed to trigger STK Push",
                data: response
            });
        }

    } catch (e) {
        console.error("An error occurred while triggering the STK-Push: ", e);
        
        // Always send a response in the catch block to prevent hanging requests
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: e.message
        });
    }
}