import { updateOrderStatusInDB } from "./db_helper.js";

export async function updateOrderStatus(req, res) {
    console.log("🚨 ROUTE HIT: updateOrderStatus function was triggered!");
    
    try {
        console.log("Body:", req.body, "Params:", req.params);
        const { id } = req.params;
        const status = req.body.status?.toLowerCase();
    
        const allowedStatus = ["pending", "received", "delivered"];
    
        if (!allowedStatus.includes(status)) {
            console.log("❌ EXITED: Invalid status value ->", status);
            return res.status(400).json({ error: "Invalid status value" });
        }

        console.log("🔄 Calling DB helper with status:", status, "id:", id);
        const response = await updateOrderStatusInDB(status, id);
        
        if (!response) {
            console.log("❌ EXITED: Order not found in database for ID:", id);
            return res.status(404).json({ error: "Order not found" });
        }
    
        console.log("✅ SUCCESS REACHED: Sending 200 OK for order:", id);
        return res.status(200).json({
            success: true,
            message: "Order status updated successfully",
            data: response
        });
    
    } catch (e) {
        console.error("💥 CATCH BLOCK TRIGGERED. Error:", e);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}