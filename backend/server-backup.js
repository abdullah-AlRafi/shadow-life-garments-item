const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");

const { createClient } = require("@supabase/supabase-js");

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// =========================
// SUPABASE CLIENTS
// =========================

// Main backend client.
// Uses the SECRET key and must NEVER be exposed to the frontend.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    global: {
      headers: {
        "x-client-info": "shadow-life-garments-item",
      },
    },
  },
);

// Separate client used only to verify the logged-in user's access token.
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  },
);

// =========================
// ADMIN AUTHENTICATION
// =========================

const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const accessToken = authHeader.replace("Bearer ", "").trim();

    if (!accessToken) {
      return res.status(401).json({
        error: "Authentication token is missing",
      });
    }

    const {
      data: { user },
      error,
    } = await supabaseAuth.auth.getUser(accessToken);

    if (error || !user) {
      console.error("Authentication error:", error);

      return res.status(401).json({
        error: "Invalid or expired authentication token",
      });
    }

    // Store authenticated user information for later use if needed.
    req.user = user;

    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);

    return res.status(401).json({
      error: "Authentication failed",
    });
  }
};

// =========================
// HOME
// =========================

app.get("/", (req, res) => {
  res.json({
    message: "Shadow Life Garments Item API is running!",
  });
});

// =========================
// GET ALL PRODUCTS
// PUBLIC
// =========================

app.get("/api/products", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        error: error.message,
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

// =========================
// GET ALL CATEGORIES
// PUBLIC
// =========================

app.get("/api/categories", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      return res.status(500).json({
        error: error.message,
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

// =========================
// ADD PRODUCT
// ADMIN ONLY
// =========================

app.post("/api/products", requireAdmin, async (req, res) => {
  try {
    const { name, description, price, stock, category_id, image_url } =
      req.body;

    if (!name || price === undefined || stock === undefined) {
      return res.status(400).json({
        error: "Name, price and stock are required",
      });
    }

    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          name,
          description,
          price: Number(price),
          stock: Number(stock),
          category_id,
          image_url,
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: error.message,
      });
    }

    console.log("Product data received:", data);

    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

// =========================
// UPDATE PRODUCT
// ADMIN ONLY
// =========================

app.put("/api/products/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { name, description, price, stock, category_id, image_url } =
      req.body;

    if (!name || price === undefined || stock === undefined) {
      return res.status(400).json({
        error: "Name, price and stock are required",
      });
    }

    const { data, error } = await supabase
      .from("products")
      .update({
        name,
        description,
        price: Number(price),
        stock: Number(stock),
        category_id,
        ...(image_url ? { image_url } : {}),
      })
      .eq("id", id)
      .select("*");

    if (error) {
      console.error("Supabase update error:", error);

      return res.status(500).json({
        error: error.message,
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        error: "Product not found or update was not allowed",
      });
    }

    res.status(200).json(data[0]);
  } catch (error) {
    console.error("Update error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

// =========================
// DELETE PRODUCT
// ADMIN ONLY
// =========================

app.delete("/api/products/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .select("*");

    if (error) {
      console.error("Supabase delete error:", error);

      return res.status(500).json({
        error: error.message,
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        error: "Product not found or delete was not allowed",
      });
    }

    res.status(200).json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

// =========================
// CREATE ORDER
// PUBLIC
// =========================

app.post("/api/orders", async (req, res) => {
  try {
    const {
      customer_name,
      phone,
      address,
      payment_method,
      payment_phone,
      transaction_id,
      items,
    } = req.body;

    // -------------------------
    // Validate customer details
    // -------------------------

    if (!customer_name || !phone || !address) {
      return res.status(400).json({
        error: "Customer name, phone and address are required",
      });
    }

    // -------------------------
    // Validate payment method
    // -------------------------

    const selectedPaymentMethod = payment_method || "cash_on_delivery";

    const allowedPaymentMethods = [
      "cash_on_delivery",
      "bkash",
      "nagad",
      "rocket",
    ];

    if (!allowedPaymentMethods.includes(selectedPaymentMethod)) {
      return res.status(400).json({
        error: "Invalid payment method",
      });
    }

    // -------------------------
    // Validate online payment
    // -------------------------

    if (selectedPaymentMethod !== "cash_on_delivery") {
      if (!payment_phone || !payment_phone.trim()) {
        return res.status(400).json({
          error: "Payment phone number is required",
        });
      }

      if (!transaction_id || !transaction_id.trim()) {
        return res.status(400).json({
          error: "Transaction ID is required",
        });
      }
    }

    // -------------------------
    // Validate cart
    // -------------------------

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "Order must contain at least one product",
      });
    }

    // -------------------------
    // Get latest product data
    // -------------------------

    const productIds = items.map((item) => item.product_id);

    const { data: products, error: productError } = await supabase
      .from("products")
      .select("id, name, price, stock")
      .in("id", productIds);

    if (productError) {
      return res.status(500).json({
        error: productError.message,
      });
    }

    let totalAmount = 0;
    const orderItems = [];

    // -------------------------
    // Validate products
    // -------------------------

    for (const item of items) {
      const product = products.find(
        (product) => product.id === item.product_id,
      );

      if (!product) {
        return res.status(400).json({
          error: `Product not found: ${item.product_id}`,
        });
      }

      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
          error: `Invalid quantity for ${product.name}`,
        });
      }

      if (quantity > product.stock) {
        return res.status(400).json({
          error: `Not enough stock for ${product.name}. Available: ${product.stock}`,
        });
      }

      const itemPrice = Number(product.price);

      totalAmount += itemPrice * quantity;

      orderItems.push({
        product_id: product.id,
        quantity,
        price: itemPrice,
      });
    }

    // -------------------------
    // Create order
    // -------------------------

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert([
        {
          customer_name,
          phone,
          address,
          total_amount: totalAmount,
          status: "pending",

          payment_method: selectedPaymentMethod,

          payment_status:
            selectedPaymentMethod === "cash_on_delivery" ? "unpaid" : "pending",

          payment_phone:
            selectedPaymentMethod === "cash_on_delivery" ? null : payment_phone,

          transaction_id:
            selectedPaymentMethod === "cash_on_delivery"
              ? null
              : transaction_id,
        },
      ])
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);

      return res.status(500).json({
        error: orderError.message,
      });
    }

    // -------------------------
    // Create order items
    // -------------------------

    const itemsToInsert = orderItems.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(itemsToInsert);

    if (itemsError) {
      console.error("Order items error:", itemsError);

      await supabase.from("orders").delete().eq("id", order.id);

      return res.status(500).json({
        error: itemsError.message,
      });
    }

    // -------------------------
    // Update product stock
    // -------------------------

    for (const item of orderItems) {
      const product = products.find(
        (product) => product.id === item.product_id,
      );

      const newStock = product.stock - item.quantity;

      const { error: stockError } = await supabase
        .from("products")
        .update({
          stock: newStock,
        })
        .eq("id", product.id);

      if (stockError) {
        console.error("Stock update error:", stockError);

        return res.status(500).json({
          error: "Order created, but stock update failed",
        });
      }
    }

    console.log("Order created:", order.id);

    res.status(201).json({
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    console.error("Order error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

// =========================
// GET ALL ORDERS
// ADMIN ONLY
// =========================

app.get("/api/orders", requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        error: error.message,
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

// =========================
// GET ORDER DETAILS
// ADMIN ONLY
// =========================

app.get("/api/orders/:id/details", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get the order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (orderError) {
      console.error("Order details error:", orderError);

      return res.status(500).json({
        error: orderError.message,
      });
    }

    if (!order) {
      return res.status(404).json({
        error: "Order not found",
      });
    }

    // Get order items
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", id);

    if (itemsError) {
      console.error("Order items details error:", itemsError);

      return res.status(500).json({
        error: itemsError.message,
      });
    }

    // Get product information for each order item
    const productIds = orderItems.map((item) => item.product_id);

    let products = [];

    if (productIds.length > 0) {
      const { data, error: productsError } = await supabase
        .from("products")
        .select("id, name, image_url")
        .in("id", productIds);

      if (productsError) {
        console.error("Order product details error:", productsError);

        return res.status(500).json({
          error: productsError.message,
        });
      }

      products = data || [];
    }

    // Combine order items with product information
    const items = orderItems.map((item) => {
      const product = products.find(
        (product) => product.id === item.product_id,
      );

      return {
        ...item,
        product_name: product ? product.name : "Product unavailable",
        image_url: product ? product.image_url : null,
      };
    });

    res.status(200).json({
      order,
      items,
    });
  } catch (error) {
    console.error("Order details error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

// =========================
// UPDATE ORDER STATUS
// ADMIN ONLY
// =========================

app.put("/api/orders/:id/status", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_status } = req.body;

    const allowedOrderStatuses = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];

    const allowedPaymentStatuses = ["unpaid", "pending", "paid", "rejected"];

    if (status !== undefined && !allowedOrderStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid order status",
      });
    }

    if (
      payment_status !== undefined &&
      !allowedPaymentStatuses.includes(payment_status)
    ) {
      return res.status(400).json({
        error: "Invalid payment status",
      });
    }

    if (status === undefined && payment_status === undefined) {
      return res.status(400).json({
        error: "At least one status is required",
      });
    }

    const updateData = {};

    if (status !== undefined) {
      updateData.status = status;
    }

    if (payment_status !== undefined) {
      updateData.payment_status = payment_status;
    }

    const { data, error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("Order status update error:", error);

      return res.status(500).json({
        error: error.message,
      });
    }

    res.status(200).json({
      message: "Order status updated successfully",
      order: data,
    });
  } catch (error) {
    console.error("Order status update error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

// =========================
// UPLOAD PRODUCT IMAGE
// ADMIN ONLY
// =========================

// =========================
// UPLOAD PRODUCT IMAGE
// ADMIN ONLY
// =========================

app.post(
  "/api/upload-image",
  requireAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "No image file was uploaded",
        });
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/jpg",
      ];

      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          error: "Only JPG, JPEG, PNG and WEBP images are allowed",
        });
      }

      const fileExtension =
        req.file.originalname.split(".").pop()?.toLowerCase() || "jpg";

      const fileName = `product-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}.${fileExtension}`;

      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        console.error("Supabase image upload error:", uploadError);

        return res.status(500).json({
          error: uploadError.message,
        });
      }

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        return res.status(500).json({
          error: "Could not generate image URL",
        });
      }

      console.log("Product image uploaded:", publicUrlData.publicUrl);

      res.status(200).json({
        message: "Image uploaded successfully",
        url: publicUrlData.publicUrl,
      });
    } catch (error) {
      console.error("Image upload error:", error);

      res.status(500).json({
        error: error.message,
      });
    }
  },
);

// =========================
// TEST SUPABASE CONNECTION
// =========================

app.get("/api/test-supabase", async (req, res) => {
  try {
    const { data, error } = await supabase.from("orders").select("id").limit(1);

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: "Supabase connection is working",
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =========================
// START SERVER
// =========================

if (require.main === module) {
  app.listen(process.env.PORT || PORT, () => {
    console.log(
      `Backend server running at http://localhost:${process.env.PORT || PORT}`,
    );
  });
}

// Export Express app for Vercel
module.exports = app;
