import express from "express";
import "./models/tps.js";
import "./models/create_orders.js";
import { handleSafaricomCallback, processSTKPushTrigger } from "./models/tps.js";
import { createOrders } from "./models/create_orders.js";
import { updateOrderStatus } from "./models/update_order_status.js";
import { getOrders } from "./models/get_orders.js";

export function processSTKPushTriggerRouter(){
  try{


      const router = express.Router();

      router.post("/", async(req,res)=>{


           await processSTKPushTrigger(req,res);
            

      });

      return router;
      
      

  }catch(e){

    console.error(e);

  }

}

export function handleSafaricomCallbackRouter(){

      
    try{

        const router = express.Router();
        router.post("/callback",async(req,res)=>{

              
            await handleSafaricomCallback(req,res);


        });

        return router;

    }catch(e){

        console.error(e);

    }
}

export function createOrderRouter(){


    try{


           const router = express.Router();
           router.post("/",async(req,res)=>{


                 await createOrders(req,res);
           });

           return router;



    }catch(e){

         console.error(e);
    }


}

export function updateOrderStatusRouter(){
      

    try{


        const router = express.Router();
        router.put("/orders/:id",async(req,res)=>{

               
              await updateOrderStatus(req,res);
        });

        return router;


    }catch(e){

        console.error(e);
    }
}

export function getOrdersRouter(){
       

      try{


            const router = express.Router();
            router.get("/orders",async(req,res)=>{

                   
                await getOrders(req,res);
            });
            return router;
         

      }catch(e){
          
        console.error(e);
      }
}