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

// =========================
// FILE UPLOAD CONFIGURATION
// =========================

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
// Uses the SECRET key.
// NEVER expose this key to the frontend.

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

// Separate client used to verify logged-in users.

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
// CUSTOMER AUTHENTICATION
// =========================

const requireCustomer = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Customer login is required",
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
      console.error("Customer authentication error:", error);

      return res.status(401).json({
        error: "Invalid or expired authentication token",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("Customer authentication middleware error:", error);

    return res.status(401).json({
      error: "Authentication failed",
    });
  }
};

// =========================
// OPTIONAL CUSTOMER AUTH
// =========================

// Allows both guest and logged-in checkout.
// If a valid token exists, req.user is populated.
// Otherwise checkout continues as guest.

const optionalCustomer = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }

    const accessToken = authHeader.replace("Bearer ", "").trim();

    if (!accessToken) {
      req.user = null;
      return next();
    }

    const {
      data: { user },
      error,
    } = await supabaseAuth.auth.getUser(accessToken);

    if (!error && user) {
      req.user = user;
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
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

// =========================================================
// PRODUCTS
// =========================================================

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
// GET SINGLE PRODUCT
// PUBLIC
// =========================

app.get("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return res.status(404).json({
        error: "Product not found",
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
// GET PRODUCT SIZES
// PUBLIC
// =========================

app.get("/api/products/:id/sizes", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("product_sizes")
      .select("*")
      .eq("product_id", id)
      .order("size", { ascending: true });

    if (error) {
      return res.status(500).json({
        error: error.message,
      });
    }

    res.json(data || []);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

// =========================
// GET PRODUCT IMAGES
// PUBLIC
// =========================

app.get("/api/products/:id/images", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return res.status(500).json({
        error: error.message,
      });
    }

    res.json(data || []);
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
    const {
      name,
      description,
      price,
      stock,
      category_id,
      image_url,
      original_price,
      sizes,
      image_urls,
    } = req.body;

    if (!name || price === undefined || stock === undefined) {
      return res.status(400).json({
        error: "Name, price and stock are required",
      });
    }

    const currentPrice = Number(price);

    const originalPrice =
      original_price === undefined ||
      original_price === null ||
      original_price === ""
        ? null
        : Number(original_price);

    if (!Number.isFinite(currentPrice) || currentPrice < 0) {
      return res.status(400).json({
        error: "Invalid price",
      });
    }

    if (originalPrice !== null) {
      if (!Number.isFinite(originalPrice) || originalPrice < currentPrice) {
        return res.status(400).json({
          error:
            "Original price must be greater than or equal to selling price",
        });
      }
    }

    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          name,
          description,
          price: currentPrice,
          original_price: originalPrice,
          stock: Number(stock),
          category_id: category_id || null,
          image_url: image_url || null,
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: error.message,
      });
    }

    const product = data;

    // -------------------------
    // Add sizes
    // -------------------------

    if (Array.isArray(sizes) && sizes.length > 0) {
      const sizeRows = sizes
        .filter((item) => item && item.size)
        .map((item) => ({
          product_id: product.id,
          size: String(item.size).trim(),
          stock: Number(item.stock) || 0,
        }));

      if (sizeRows.length > 0) {
        const { error: sizeError } = await supabase
          .from("product_sizes")
          .insert(sizeRows);

        if (sizeError) {
          console.error("Product size error:", sizeError);
        }
      }
    }

    // -------------------------
    // Add multiple images
    // -------------------------

    if (Array.isArray(image_urls) && image_urls.length > 0) {
      const imageRows = image_urls
        .filter((url) => url)
        .map((url, index) => ({
          product_id: product.id,
          image_url: url,
          sort_order: index,
        }));

      if (imageRows.length > 0) {
        const { error: imageError } = await supabase
          .from("product_images")
          .insert(imageRows);

        if (imageError) {
          console.error("Product image records error:", imageError);
        }
      }
    }

    console.log("Product created:", product.id);

    res.status(201).json(product);
  } catch (error) {
    console.error("Add product error:", error);

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

    const {
      name,
      description,
      price,
      stock,
      category_id,
      image_url,
      original_price,
      sizes,
      image_urls,
    } = req.body;

    if (!name || price === undefined || stock === undefined) {
      return res.status(400).json({
        error: "Name, price and stock are required",
      });
    }

    const currentPrice = Number(price);

    const originalPrice =
      original_price === undefined ||
      original_price === null ||
      original_price === ""
        ? null
        : Number(original_price);

    if (!Number.isFinite(currentPrice) || currentPrice < 0) {
      return res.status(400).json({
        error: "Invalid price",
      });
    }

    if (originalPrice !== null) {
      if (!Number.isFinite(originalPrice) || originalPrice < currentPrice) {
        return res.status(400).json({
          error:
            "Original price must be greater than or equal to selling price",
        });
      }
    }

    const updateData = {
      name,
      description,
      price: currentPrice,
      original_price: originalPrice,
      stock: Number(stock),
      category_id: category_id || null,
    };

    if (image_url !== undefined) {
      updateData.image_url = image_url || null;
    }

    const { data, error } = await supabase
      .from("products")
      .update(updateData)
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
        error: "Product not found",
      });
    }

    // -------------------------
    // Update sizes if supplied
    // -------------------------

    if (Array.isArray(sizes)) {
      await supabase.from("product_sizes").delete().eq("product_id", id);

      const sizeRows = sizes
        .filter((item) => item && item.size)
        .map((item) => ({
          product_id: id,
          size: String(item.size).trim(),
          stock: Number(item.stock) || 0,
        }));

      if (sizeRows.length > 0) {
        const { error: sizeError } = await supabase
          .from("product_sizes")
          .insert(sizeRows);

        if (sizeError) {
          console.error("Product size update error:", sizeError);
        }
      }
    }

    // -------------------------
    // Replace image records if supplied
    // -------------------------

    if (Array.isArray(image_urls)) {
      await supabase.from("product_images").delete().eq("product_id", id);

      const imageRows = image_urls
        .filter((url) => url)
        .map((url, index) => ({
          product_id: id,
          image_url: url,
          sort_order: index,
        }));

      if (imageRows.length > 0) {
        const { error: imageError } = await supabase
          .from("product_images")
          .insert(imageRows);

        if (imageError) {
          console.error("Product image update error:", imageError);
        }
      }
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
        error: "Product not found",
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

// =========================================================
// CATEGORIES
// =========================================================

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
// ADD CATEGORY
// ADMIN ONLY
// =========================

app.post("/api/categories", requireAdmin, async (req, res) => {
  try {
    const { name, image_url } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: "Category name is required",
      });
    }

    const categoryName = name.trim();

    const { data, error } = await supabase
      .from("categories")
      .insert([
        {
          name: categoryName,
          image_url: image_url || null,
        },
      ])
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          error: "A category with this name already exists",
        });
      }

      return res.status(500).json({
        error: error.message,
      });
    }

    res.status(201).json({
      message: "Category added successfully",
      category: data,
    });
  } catch (error) {
    console.error("Add category error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

// =========================
// UPDATE CATEGORY
// ADMIN ONLY
// =========================

app.put("/api/categories/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image_url } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: "Category name is required",
      });
    }

    const { data, error } = await supabase
      .from("categories")
      .update({
        name: name.trim(),
        image_url: image_url || null,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          error: "A category with this name already exists",
        });
      }

      return res.status(500).json({
        error: error.message,
      });
    }

    res.json({
      message: "Category updated successfully",
      category: data,
    });
  } catch (error) {
    console.error("Update category error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

// =========================
// DELETE CATEGORY
// ADMIN ONLY
// =========================

app.delete("/api/categories/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .select("*");

    if (error) {
      return res.status(500).json({
        error: error.message,
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        error: "Category not found",
      });
    }

    res.json({
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

// =========================================================
// PRODUCT SIZES
// =========================================================

// =========================
// ADD / UPDATE PRODUCT SIZE
// ADMIN ONLY
// =========================

app.post("/api/products/:id/sizes", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { size, stock } = req.body;

    if (!size || !size.trim()) {
      return res.status(400).json({
        error: "Size is required",
      });
    }

    const stockValue = Number(stock);

    if (!Number.isInteger(stockValue) || stockValue < 0) {
      return res.status(400).json({
        error: "Stock must be a non-negative integer",
      });
    }

    const { data, error } = await supabase
      .from("product_sizes")
      .upsert(
        [
          {
            product_id: id,
            size: size.trim(),
            stock: stockValue,
          },
        ],
        {
          onConflict: "product_id,size",
        },
      )
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({
        error: error.message,
      });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("Product size error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

// =========================
// DELETE PRODUCT SIZE
// ADMIN ONLY
// =========================

app.delete(
  "/api/products/:productId/sizes/:sizeId",
  requireAdmin,
  async (req, res) => {
    try {
      const { productId, sizeId } = req.params;

      const { data, error } = await supabase
        .from("product_sizes")
        .delete()
        .eq("id", sizeId)
        .eq("product_id", productId)
        .select("*");

      if (error) {
        return res.status(500).json({
          error: error.message,
        });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({
          error: "Size not found",
        });
      }

      res.json({
        message: "Product size deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        error: error.message,
      });
    }
  },
);

// =========================================================
// PRODUCT IMAGES
// =========================================================

// =========================
// ADD PRODUCT IMAGE RECORD
// ADMIN ONLY
// =========================

app.post("/api/products/:id/images", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { image_url, sort_order } = req.body;

    if (!image_url) {
      return res.status(400).json({
        error: "Image URL is required",
      });
    }

    const { data, error } = await supabase
      .from("product_images")
      .insert([
        {
          product_id: id,
          image_url,
          sort_order: Number(sort_order) || 0,
        },
      ])
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({
        error: error.message,
      });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("Product image record error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

// =========================
// DELETE PRODUCT IMAGE RECORD
// ADMIN ONLY
// =========================

app.delete(
  "/api/products/:productId/images/:imageId",
  requireAdmin,
  async (req, res) => {
    try {
      const { productId, imageId } = req.params;

      const { data, error } = await supabase
        .from("product_images")
        .delete()
        .eq("id", imageId)
        .eq("product_id", productId)
        .select("*");

      if (error) {
        return res.status(500).json({
          error: error.message,
        });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({
          error: "Product image not found",
        });
      }

      res.json({
        message: "Product image deleted successfully",
      });
    } catch (error) {
      console.error("Delete product image error:", error);

      res.status(500).json({
        error: error.message,
      });
    }
  },
);

// =========================================================
// CUSTOMER PROFILE
// =========================================================

// =========================
// GET MY PROFILE
// CUSTOMER ONLY
// =========================

app.get("/api/profile", requireCustomer, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("customer_profiles")
      .select("*")
      .eq("id", req.user.id)
      .maybeSingle();

    if (error) {
      console.error("Get profile Supabase error:", error);

      return res.status(500).json({
        error: error.message,
      });
    }

    // IMPORTANT:
    // Phone is stored in customer_profiles.phone.
    // Supabase Auth phone is kept only as a fallback.

    const profilePhone = data?.phone || req.user.phone || null;

    res.json({
      profile: data
        ? {
            ...data,
            phone: profilePhone,
          }
        : null,

      auth_user: {
        id: req.user.id,
        email: req.user.email || null,
        phone: req.user.phone || null,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

// =========================
// CREATE / UPDATE MY PROFILE
// CUSTOMER ONLY
// =========================

app.put("/api/profile", requireCustomer, async (req, res) => {
  try {
    const { full_name, phone, district, home_address } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({
        error: "Full name is required",
      });
    }

    const cleanedPhone = phone && phone.trim() ? phone.trim() : null;

    const cleanedDistrict =
      district && district.trim() ? district.trim() : null;

    const cleanedAddress =
      home_address && home_address.trim() ? home_address.trim() : null;

    const { data, error } = await supabase
      .from("customer_profiles")
      .upsert(
        [
          {
            id: req.user.id,
            full_name: full_name.trim(),
            phone: cleanedPhone,
            district: cleanedDistrict,
            home_address: cleanedAddress,
            updated_at: new Date().toISOString(),
          },
        ],
        {
          onConflict: "id",
        },
      )
      .select("*")
      .single();

    if (error) {
      console.error("Supabase profile update error:", error);

      return res.status(500).json({
        error: error.message,
      });
    }

    res.json({
      message: "Profile saved successfully",

      profile: data,

      auth_user: {
        id: req.user.id,
        email: req.user.email || null,

        // Return the saved customer profile phone.
        phone: data?.phone || req.user.phone || null,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

// =========================================================
// CREATE ORDER
// GUEST OR LOGGED-IN CUSTOMER
// =========================================================

app.post("/api/orders", optionalCustomer, async (req, res) => {
  try {
    const {
      customer_name,
      phone,
      email,
      district,
      address,
      order_notes,
      delivery_method,
      delivery_charge,
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
    // Validate delivery
    // -------------------------

    const allowedDeliveryMethods = ["inside_dhaka", "outside_dhaka"];

    if (!allowedDeliveryMethods.includes(delivery_method)) {
      return res.status(400).json({
        error: "Please select a valid delivery method",
      });
    }

    const expectedDeliveryCharge =
      delivery_method === "inside_dhaka" ? 80 : 120;

    const finalDeliveryCharge = expectedDeliveryCharge;

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

    const productIds = [
      ...new Set(items.map((item) => item.product_id).filter(Boolean)),
    ];

    const { data: products, error: productError } = await supabase
      .from("products")
      .select("id, name, price, original_price, stock, category_id, image_url")
      .in("id", productIds);

    if (productError) {
      return res.status(500).json({
        error: productError.message,
      });
    }

    let productSubtotal = 0;

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

      const selectedSize = item.size ? String(item.size).trim() : null;

      // -------------------------
      // Check size stock
      // -------------------------

      let sizeRecord = null;

      if (selectedSize) {
        const { data: sizeData, error: sizeError } = await supabase
          .from("product_sizes")
          .select("id, size, stock")
          .eq("product_id", product.id)
          .eq("size", selectedSize)
          .maybeSingle();

        if (sizeError) {
          return res.status(500).json({
            error: sizeError.message,
          });
        }

        if (!sizeData) {
          return res.status(400).json({
            error: `Size ${selectedSize} is not available for ${product.name}`,
          });
        }

        sizeRecord = sizeData;

        if (quantity > sizeRecord.stock) {
          return res.status(400).json({
            error:
              `Not enough stock for ${product.name} (${selectedSize}). ` +
              `Available: ${sizeRecord.stock}`,
          });
        }
      } else {
        // Existing products without size-specific stock.

        if (quantity > product.stock) {
          return res.status(400).json({
            error:
              `Not enough stock for ${product.name}. ` +
              `Available: ${product.stock}`,
          });
        }
      }

      const itemPrice = Number(product.price);

      const itemOriginalPrice =
        product.original_price !== null && product.original_price !== undefined
          ? Number(product.original_price)
          : null;

      productSubtotal += itemPrice * quantity;

      orderItems.push({
        product_id: product.id,
        quantity,
        price: itemPrice,
        original_price: itemOriginalPrice,
        size: selectedSize,
        size_record_id: sizeRecord ? sizeRecord.id : null,
      });
    }

    // -------------------------
    // Calculate final total
    // -------------------------

    const totalAmount = productSubtotal + finalDeliveryCharge;

    // -------------------------
    // Create order
    // -------------------------

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert([
        {
          customer_id: req.user ? req.user.id : null,

          customer_name,
          phone,
          email: email || null,
          district: district || null,
          address,
          order_notes: order_notes || null,

          delivery_method,
          delivery_charge: finalDeliveryCharge,

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
      original_price: item.original_price,
      size: item.size,
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
    // Update stock
    // -------------------------

    for (const item of orderItems) {
      if (item.size_record_id) {
        const { data: sizeData } = await supabase
          .from("product_sizes")
          .select("stock")
          .eq("id", item.size_record_id)
          .single();

        if (sizeData) {
          const newSizeStock = Number(sizeData.stock) - item.quantity;

          const { error: sizeStockError } = await supabase
            .from("product_sizes")
            .update({
              stock: newSizeStock,
            })
            .eq("id", item.size_record_id);

          if (sizeStockError) {
            console.error("Size stock update error:", sizeStockError);
          }
        }
      } else {
        const product = products.find(
          (product) => product.id === item.product_id,
        );

        const newStock = Number(product.stock) - item.quantity;

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

// =========================================================
// CUSTOMER ORDER HISTORY
// =========================================================

// =========================
// GET MY ORDERS
// CUSTOMER ONLY
// =========================

app.get("/api/my-orders", requireCustomer, async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("customer_id", req.user.id)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      return res.status(500).json({
        error: error.message,
      });
    }

    res.json(orders || []);
  } catch (error) {
    console.error("Customer order history error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

// =========================================================
// ADMIN ORDERS
// =========================================================

// =========================
// GET ALL ORDERS
// ADMIN ONLY
// =========================

app.get("/api/orders", requireAdmin, async (req, res) => {
  try {
    let query = supabase.from("orders").select("*").order("created_at", {
      ascending: false,
    });

    const { month } = req.query;

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const startDate = `${month}-01`;

      const [year, monthNumber] = month.split("-").map(Number);

      const nextMonthDate = new Date(Date.UTC(year, monthNumber, 1));

      const nextMonth = nextMonthDate.toISOString().slice(0, 10);

      query = query
        .gte("created_at", `${startDate}T00:00:00.000Z`)
        .lt("created_at", `${nextMonth}T00:00:00.000Z`);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({
        error: error.message,
      });
    }

    res.json(data || []);
  } catch (error) {
    console.error("Get orders error:", error);

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

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (orderError) {
      console.error("Order details error:", orderError);

      return res.status(404).json({
        error: "Order not found",
      });
    }

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

    const productIds = [
      ...new Set(
        (orderItems || []).map((item) => item.product_id).filter(Boolean),
      ),
    ];

    let products = [];

    if (productIds.length > 0) {
      const { data, error: productsError } = await supabase
        .from("products")
        .select("id, name, image_url")
        .in("id", productIds);

      if (productsError) {
        return res.status(500).json({
          error: productsError.message,
        });
      }

      products = data || [];
    }

    const items = (orderItems || []).map((item) => {
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

// =========================================================
// DELETE ORDER
// ADMIN ONLY
// =========================================================

app.delete("/api/orders/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("product_id, quantity, size")
      .eq("order_id", id);

    if (itemsError) {
      return res.status(500).json({
        error: itemsError.message,
      });
    }

    // -------------------------
    // Restore stock
    // -------------------------

    for (const item of orderItems || []) {
      if (!item.product_id) {
        continue;
      }

      if (item.size) {
        const { data: sizeData } = await supabase
          .from("product_sizes")
          .select("id, stock")
          .eq("product_id", item.product_id)
          .eq("size", item.size)
          .maybeSingle();

        if (sizeData) {
          await supabase
            .from("product_sizes")
            .update({
              stock: Number(sizeData.stock) + Number(item.quantity),
            })
            .eq("id", sizeData.id);

          continue;
        }
      }

      const { data: productData } = await supabase
        .from("products")
        .select("stock")
        .eq("id", item.product_id)
        .maybeSingle();

      if (productData) {
        await supabase
          .from("products")
          .update({
            stock: Number(productData.stock) + Number(item.quantity),
          })
          .eq("id", item.product_id);
      }
    }

    const { data, error } = await supabase
      .from("orders")
      .delete()
      .eq("id", id)
      .select("*");

    if (error) {
      console.error("Delete order error:", error);

      return res.status(500).json({
        error: error.message,
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        error: "Order not found",
      });
    }

    res.json({
      message: "Order deleted successfully",
      order_id: id,
    });
  } catch (error) {
    console.error("Delete order error:", error);

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

// =========================================================
// ORDER STATISTICS
// =========================================================

// =========================
// GET ORDER STATISTICS
// ADMIN ONLY
// =========================

app.get("/api/orders/stats", requireAdmin, async (req, res) => {
  try {
    const { month } = req.query;

    let query = supabase
      .from("orders")
      .select("id, total_amount, status, created_at")
      .order("created_at", {
        ascending: true,
      });

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, monthNumber] = month.split("-").map(Number);

      const startDate = `${month}-01`;

      const nextMonthDate = new Date(Date.UTC(year, monthNumber, 1));

      const nextMonth = nextMonthDate.toISOString().slice(0, 10);

      query = query
        .gte("created_at", `${startDate}T00:00:00.000Z`)
        .lt("created_at", `${nextMonth}T00:00:00.000Z`);
    }

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      return res.status(500).json({
        error: ordersError.message,
      });
    }

    const orderIds = (orders || []).map((order) => order.id);

    let orderItems = [];

    if (orderIds.length > 0) {
      const { data, error: itemsError } = await supabase
        .from("order_items")
        .select("order_id, product_id, quantity, price")
        .in("order_id", orderIds);

      if (itemsError) {
        return res.status(500).json({
          error: itemsError.message,
        });
      }

      orderItems = data || [];
    }

    const activeOrders = (orders || []).filter(
      (order) => order.status !== "cancelled",
    );

    const totalOrders = activeOrders.length;

    const totalProductsSold = orderItems
      .filter((item) => {
        const order = (orders || []).find(
          (order) => order.id === item.order_id,
        );

        return order && order.status !== "cancelled";
      })
      .reduce((total, item) => total + Number(item.quantity), 0);

    const totalEarnings = activeOrders.reduce(
      (total, order) => total + Number(order.total_amount || 0),
      0,
    );

    res.json({
      month: month || "all",
      total_orders: totalOrders,
      total_products_sold: totalProductsSold,
      total_earnings: totalEarnings,
      cancelled_orders: (orders || []).filter(
        (order) => order.status === "cancelled",
      ).length,
    });
  } catch (error) {
    console.error("Order statistics error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

// =========================
// MONTHLY STATISTICS
// ADMIN ONLY
// =========================

app.get("/api/orders/monthly-stats", requireAdmin, async (req, res) => {
  try {
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, total_amount, status, created_at")
      .order("created_at", {
        ascending: true,
      });

    if (ordersError) {
      return res.status(500).json({
        error: ordersError.message,
      });
    }

    const orderIds = (orders || []).map((order) => order.id);

    let orderItems = [];

    if (orderIds.length > 0) {
      const { data, error: itemsError } = await supabase
        .from("order_items")
        .select("order_id, quantity")
        .in("order_id", orderIds);

      if (itemsError) {
        return res.status(500).json({
          error: itemsError.message,
        });
      }

      orderItems = data || [];
    }

    const monthlyMap = {};

    for (const order of orders || []) {
      if (order.status === "cancelled") {
        continue;
      }

      const date = new Date(order.created_at);

      const monthKey =
        `${date.getUTCFullYear()}-` +
        `${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          month: monthKey,
          orders: 0,
          products_sold: 0,
          earnings: 0,
        };
      }

      monthlyMap[monthKey].orders += 1;

      monthlyMap[monthKey].earnings += Number(order.total_amount || 0);
    }

    for (const item of orderItems) {
      const order = (orders || []).find((order) => order.id === item.order_id);

      if (!order || order.status === "cancelled") {
        continue;
      }

      const date = new Date(order.created_at);

      const monthKey =
        `${date.getUTCFullYear()}-` +
        `${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          month: monthKey,
          orders: 0,
          products_sold: 0,
          earnings: 0,
        };
      }

      monthlyMap[monthKey].products_sold += Number(item.quantity);
    }

    const monthlyStats = Object.values(monthlyMap).sort((a, b) =>
      a.month.localeCompare(b.month),
    );

    res.json(monthlyStats);
  } catch (error) {
    console.error("Monthly statistics error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

// =========================================================
// IMAGE UPLOAD
// =========================================================

// =========================
// UPLOAD ONE PRODUCT IMAGE
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

      const fileName =
        `product-${Date.now()}-` +
        `${Math.random().toString(36).substring(2, 8)}.` +
        `${fileExtension}`;

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
// UPLOAD MULTIPLE PRODUCT IMAGES
// ADMIN ONLY
// =========================

app.post(
  "/api/upload-images",
  requireAdmin,
  upload.array("images", 10),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: "No image files were uploaded",
        });
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/jpg",
      ];

      const uploadedImages = [];

      for (const file of req.files) {
        if (!allowedTypes.includes(file.mimetype)) {
          return res.status(400).json({
            error: "Only JPG, JPEG, PNG and WEBP images are allowed",
          });
        }

        const fileExtension =
          file.originalname.split(".").pop()?.toLowerCase() || "jpg";

        const fileName =
          `product-${Date.now()}-` +
          `${Math.random().toString(36).substring(2, 8)}.` +
          `${fileExtension}`;

        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          });

        if (uploadError) {
          console.error("Multiple image upload error:", uploadError);

          return res.status(500).json({
            error: uploadError.message,
          });
        }

        const { data: publicUrlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          uploadedImages.push(publicUrlData.publicUrl);
        }
      }

      res.status(200).json({
        message: "Images uploaded successfully",
        urls: uploadedImages,
      });
    } catch (error) {
      console.error("Multiple image upload error:", error);

      res.status(500).json({
        error: error.message,
      });
    }
  },
);

// =========================================================
// TEST SUPABASE CONNECTION
// =========================================================

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

// =========================================================
// START SERVER
// =========================================================

if (require.main === module) {
  app.listen(process.env.PORT || PORT, () => {
    console.log(
      `Backend server running at http://localhost:${process.env.PORT || PORT}`,
    );
  });
}

// Export Express app for Vercel

module.exports = app;
