import pkg from "pg";
import fs from "fs";
import yaml from "yaml";
// Read and parse env.yaml
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
console.log("Connecting to host:", process.env.DATABASE_URL);
const pool = new Pool({

    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }

});


export async function createOrdersAndPaymentsTable(){
      

     try {
    // Orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders(
        order_id SERIAL PRIMARY KEY,
        items_ordered TEXT NOT NULL,
        location TEXT NOT NULL,
        total INTEGER NOT NULL CHECK (total > 0),
        status TEXT NOT NULL DEFAULT 'pending'
      );
    `);

    // Payments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments(
        payment_id SERIAL PRIMARY KEY,
        order_id INT NOT NULL REFERENCES orders(order_id),
        phone_number VARCHAR(20) NOT NULL,
        amount NUMERIC(10,2) NOT NULL,
        checkout_request_id VARCHAR(100),
        mpesa_receipt VARCHAR(50),
        result_code INT,
        payment_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Orders and Payments tables ready ✅");
  } catch (err) {

    console.error("Error creating tables:", err);
    
  }
}

export async function createOrder(itemsOrdered, location, total){
    
    
  try{
      

       const response = await pool.query(

      `INSERT INTO orders (items_ordered, location, total)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [itemsOrdered, location, total]

    );

    

    return response.rows[0];

  }catch(e){
     
    console.error(e);
  }
}

export async function getAllOrders(){



    try{
            
      const response = await pool.query(`
      SELECT o.order_id, o.items_ordered, o.location, o.total::INTEGER AS total,
      o.status, p.payment_time
      FROM orders o
      LEFT JOIN payments p ON p.order_id = o.order_id
      ORDER BY o.order_id DESC;
    `);

    return response.rows;

    }catch(e){
        
      console.error(e);
    }
}

export async function updateOrderStatusInDB(status, id){

     
     try{

         
          const response = await pool.query(
          `UPDATE orders SET status = $1
           WHERE order_id = $2
           RETURNING *`,
          [status, id]
    );
    
    console.log(response.rows[0]);
    return response.rows[0];
        
         
     }catch(e){
         
        console.error(e);
     }
}

export async function findOrder(orderID){

    try{

        const orderResult = await pool.query(
       `SELECT * FROM orders WHERE order_id = $1`,
       [orderID]
    );
    console.log(orderResult.rows[0]);
    return orderResult.rows[0];

    }catch(e){
        
        console.error(e);

    }
}