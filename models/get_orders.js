import "./db_helper.js";
import { findOrder, getAllOrders } from "./db_helper.js";

export async function getOrders(req,res){


    try {
        
        const response = await getAllOrders();
        return res.json(response.map(o => ({
          ...o,          
          total: Number(o.total),
          paymentTime: o.payment_time, // will be null if not paid yet
        })));
      } catch (err) {
        console.error("GET ERROR:", err);
        res.status(500).json({ error: "Failed to fetch orders" });
      }
    
}