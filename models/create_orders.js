import  { createOrder} from "./db_helper.js";


export async function createOrders(req,res){

try{

    const { itemsOrdered, location, total, } = req.body.order;
                    
    if (!itemsOrdered || !location || !total || total <= 0){

     return res.status(400).json({ error: "Invalid order data" });

   }
    const response = await createOrder(itemsOrdered, location, total);


    return res.status(201).json({data: response});
  } catch (err) {
    console.error("INSERT ERROR:", err);
    res.status(500).json({ error: "Failed to create order" });
  } 
  
}