import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const PAYMENT_STATUSES = ["unpaid", "pending", "paid", "rejected"];

const SIZE_OPTIONS = ["S", "M", "L", "XL", "XXL"];

function formatMoney(value) {
  return `৳${Number(value || 0).toLocaleString("en-BD")}`;
}

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getDiscountPercentage(originalPrice, price) {
  const original = Number(originalPrice);
  const current = Number(price);

  if (
    !Number.isFinite(original) ||
    !Number.isFinite(current) ||
    original <= 0 ||
    current >= original
  ) {
    return 0;
  }

  return Math.round(((original - current) / original) * 100);
}

function statusClass(status) {
  return `status status-${String(status || "")
    .toLowerCase()
    .replace(/\s+/g, "-")}`;
}

function paymentLabel(method) {
  const labels = {
    cash_on_delivery: "Cash on Delivery",
    bkash: "bKash",
    nagad: "Nagad",
    rocket: "Rocket",
  };

  return labels[method] || method || "-";
}

function deliveryLabel(method) {
  if (method === "inside_dhaka") return "Inside Dhaka";
  if (method === "outside_dhaka") return "Outside Dhaka";
  return "-";
}

export default function Admin() {
  // =========================================================
  // GENERAL STATE
  // =========================================================

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // =========================================================
  // PRODUCTS
  // =========================================================

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productOriginalPrice, setProductOriginalPrice] = useState("");
  const [productStock, setProductStock] = useState("");
  const [productCategoryId, setProductCategoryId] = useState("");

  const [productImages, setProductImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [mainImageUrl, setMainImageUrl] = useState("");

  const [productSizes, setProductSizes] = useState([]);
  const [sizeName, setSizeName] = useState("");
  const [sizeStock, setSizeStock] = useState("");

  const [editingProductId, setEditingProductId] = useState(null);
  const [productSaving, setProductSaving] = useState(false);

  // =========================================================
  // CATEGORIES
  // =========================================================

  const [categoryName, setCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categorySaving, setCategorySaving] = useState(false);

  // =========================================================
  // ORDERS
  // =========================================================

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [orderLoading, setOrderLoading] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState("");

  const [stats, setStats] = useState({
    total_orders: 0,
    total_products_sold: 0,
    total_earnings: 0,
    cancelled_orders: 0,
  });

  const [monthlyStats, setMonthlyStats] = useState([]);

  // =========================================================
  // AUTH
  // =========================================================

  async function getAuthHeaders() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Admin login session not found.");
    }

    return {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    };
  }

  // =========================================================
  // MESSAGE HELPERS
  // =========================================================

  function showMessage(text) {
    setMessage(text);
    setErrorMessage("");

    setTimeout(() => {
      setMessage("");
    }, 4000);
  }

  function showError(text) {
    setErrorMessage(text);
    setMessage("");

    setTimeout(() => {
      setErrorMessage("");
    }, 5000);
  }

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadEverything();
  }, []);

  async function loadEverything() {
    try {
      setLoading(true);

      await Promise.all([
        fetchProducts(),
        fetchCategories(),
        fetchOrders(),
        fetchStats(),
        fetchMonthlyStats(),
      ]);
    } catch (error) {
      console.error(error);
      showError(error.message);
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // PRODUCTS
  // =========================================================

  async function fetchProducts() {
    const response = await fetch(`${API_URL}/api/products`);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to load products.");
    }

    setProducts(Array.isArray(data) ? data : []);
  }

  async function fetchProductExtraData(productId) {
    const [sizesResponse, imagesResponse] = await Promise.all([
      fetch(`${API_URL}/api/products/${productId}/sizes`),
      fetch(`${API_URL}/api/products/${productId}/images`),
    ]);

    const sizesData = await sizesResponse.json();
    const imagesData = await imagesResponse.json();

    if (!sizesResponse.ok) {
      throw new Error(sizesData.error || "Failed to load product sizes.");
    }

    if (!imagesResponse.ok) {
      throw new Error(imagesData.error || "Failed to load product images.");
    }

    return {
      sizes: Array.isArray(sizesData) ? sizesData : [],
      images: Array.isArray(imagesData) ? imagesData : [],
    };
  }

  function resetProductForm() {
    setEditingProductId(null);
    setProductName("");
    setProductDescription("");
    setProductPrice("");
    setProductOriginalPrice("");
    setProductStock("");
    setProductCategoryId("");
    setProductImages([]);
    setExistingImages([]);
    setMainImageUrl("");
    setProductSizes([]);
    setSizeName("");
    setSizeStock("");
  }

  async function editProduct(product) {
    try {
      setErrorMessage("");
      setMessage("");

      const extra = await fetchProductExtraData(product.id);

      setEditingProductId(product.id);
      setProductName(product.name || "");
      setProductDescription(product.description || "");
      setProductPrice(product.price ?? "");
      setProductOriginalPrice(product.original_price ?? "");
      setProductStock(product.stock ?? "");
      setProductCategoryId(product.category_id || "");

      const imageRecords = extra.images || [];

      setExistingImages(imageRecords);
      setMainImageUrl(product.image_url || imageRecords[0]?.image_url || "");

      setProductSizes(
        (extra.sizes || []).map((size) => ({
          id: size.id,
          size: size.size,
          stock: size.stock,
        })),
      );

      setProductImages([]);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(error);
      showError(error.message);
    }
  }

  async function uploadMultipleImages(files) {
    if (!files || files.length === 0) {
      return [];
    }

    if (files.length > 10) {
      throw new Error("You can upload a maximum of 10 images at once.");
    }

    const formData = new FormData();

    Array.from(files).forEach((file) => {
      formData.append("images", file);
    });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Admin login session not found.");
    }

    const response = await fetch(`${API_URL}/api/upload-images`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Image upload failed.");
    }

    return Array.isArray(data.urls) ? data.urls : [];
  }

  async function saveProduct(event) {
    event.preventDefault();

    if (!productName.trim()) {
      showError("Product name is required.");
      return;
    }

    if (productPrice === "" || productStock === "") {
      showError("Price and stock are required.");
      return;
    }

    const price = Number(productPrice);
    const stock = Number(productStock);

    if (!Number.isFinite(price) || price < 0) {
      showError("Please enter a valid selling price.");
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      showError("Stock must be a non-negative integer.");
      return;
    }

    if (
      productOriginalPrice !== "" &&
      (Number(productOriginalPrice) < price ||
        !Number.isFinite(Number(productOriginalPrice)))
    ) {
      showError(
        "Original price must be greater than or equal to selling price.",
      );
      return;
    }

    try {
      setProductSaving(true);
      setErrorMessage("");

      let uploadedUrls = [];

      if (productImages.length > 0) {
        uploadedUrls = await uploadMultipleImages(productImages);
      }

      const allImageUrls = [
        ...existingImages.map((image) => image.image_url),
        ...uploadedUrls,
      ].filter(Boolean);

      const selectedMainImage = mainImageUrl || allImageUrls[0] || null;

      const body = {
        name: productName.trim(),
        description: productDescription.trim(),
        price,
        original_price:
          productOriginalPrice === "" ? null : Number(productOriginalPrice),
        stock,
        category_id: productCategoryId || null,
        image_url: selectedMainImage,
        sizes: productSizes.map((item) => ({
          size: String(item.size).trim(),
          stock: Number(item.stock) || 0,
        })),
        image_urls: allImageUrls,
      };

      const headers = await getAuthHeaders();

      const url = editingProductId
        ? `${API_URL}/api/products/${editingProductId}`
        : `${API_URL}/api/products`;

      const method = editingProductId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not save product.");
      }

      showMessage(
        editingProductId
          ? "Product updated successfully."
          : "Product added successfully.",
      );

      resetProductForm();

      await fetchProducts();
    } catch (error) {
      console.error(error);
      showError(error.message);
    } finally {
      setProductSaving(false);
    }
  }

  async function deleteProduct(productId) {
    const product = products.find((item) => item.id === productId);

    const confirmed = window.confirm(
      `Delete "${product?.name || "this product"}"?`,
    );

    if (!confirmed) return;

    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`${API_URL}/api/products/${productId}`, {
        method: "DELETE",
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete product.");
      }

      showMessage("Product deleted successfully.");

      if (editingProductId === productId) {
        resetProductForm();
      }

      await fetchProducts();
    } catch (error) {
      console.error(error);
      showError(error.message);
    }
  }

  function addSizeRow() {
    const cleanSize = sizeName.trim();

    if (!cleanSize) {
      showError("Enter a size first.");
      return;
    }

    const numericStock = Number(sizeStock);

    if (!Number.isInteger(numericStock) || numericStock < 0) {
      showError("Size stock must be a non-negative integer.");
      return;
    }

    const duplicate = productSizes.some(
      (item) => String(item.size).toLowerCase() === cleanSize.toLowerCase(),
    );

    if (duplicate) {
      showError("This size is already added.");
      return;
    }

    setProductSizes([
      ...productSizes,
      {
        size: cleanSize,
        stock: numericStock,
      },
    ]);

    setSizeName("");
    setSizeStock("");
  }

  function addQuickSize(size) {
    const duplicate = productSizes.some(
      (item) => String(item.size).toLowerCase() === size.toLowerCase(),
    );

    if (duplicate) return;

    setProductSizes([
      ...productSizes,
      {
        size,
        stock: 0,
      },
    ]);
  }

  function removeSizeRow(index) {
    setProductSizes(productSizes.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateSizeStock(index, value) {
    setProductSizes(
      productSizes.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              stock: value,
            }
          : item,
      ),
    );
  }

  async function deleteExistingImage(imageRecord) {
    if (!editingProductId) return;

    const confirmed = window.confirm("Delete this product image?");

    if (!confirmed) return;

    try {
      const headers = await getAuthHeaders();

      const response = await fetch(
        `${API_URL}/api/products/${editingProductId}/images/${imageRecord.id}`,
        {
          method: "DELETE",
          headers,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete image.");
      }

      setExistingImages(
        existingImages.filter((image) => image.id !== imageRecord.id),
      );

      if (mainImageUrl === imageRecord.image_url) {
        setMainImageUrl("");
      }

      showMessage("Image deleted successfully.");
    } catch (error) {
      console.error(error);
      showError(error.message);
    }
  }

  // =========================================================
  // CATEGORIES
  // =========================================================

  async function fetchCategories() {
    const response = await fetch(`${API_URL}/api/categories`);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to load categories.");
    }

    setCategories(Array.isArray(data) ? data : []);
  }

  async function saveCategory(event) {
    event.preventDefault();

    const cleanName = categoryName.trim();

    if (!cleanName) {
      showError("Category name is required.");
      return;
    }

    try {
      setCategorySaving(true);

      const headers = await getAuthHeaders();

      const url = editingCategoryId
        ? `${API_URL}/api/categories/${editingCategoryId}`
        : `${API_URL}/api/categories`;

      const method = editingCategoryId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          name: cleanName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save category.");
      }

      showMessage(
        editingCategoryId
          ? "Category updated successfully."
          : "Category added successfully.",
      );

      setCategoryName("");
      setEditingCategoryId(null);

      await Promise.all([fetchCategories(), fetchProducts()]);
    } catch (error) {
      console.error(error);
      showError(error.message);
    } finally {
      setCategorySaving(false);
    }
  }

  function editCategory(category) {
    setEditingCategoryId(category.id);
    setCategoryName(category.name || "");
  }

  async function deleteCategory(category) {
    const productCount = products.filter(
      (product) => product.category_id === category.id,
    ).length;

    const confirmed = window.confirm(
      productCount > 0
        ? `"${category.name}" has ${productCount} product(s). Delete the category anyway? Products will remain but lose this category.`
        : `Delete category "${category.name}"?`,
    );

    if (!confirmed) return;

    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`${API_URL}/api/categories/${category.id}`, {
        method: "DELETE",
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete category.");
      }

      showMessage("Category deleted successfully.");

      await Promise.all([fetchCategories(), fetchProducts()]);
    } catch (error) {
      console.error(error);
      showError(error.message);
    }
  }

  // =========================================================
  // ORDERS
  // =========================================================

  async function fetchOrders(month = selectedMonth) {
    const headers = await getAuthHeaders();

    const query = month ? `?month=${encodeURIComponent(month)}` : "";

    const response = await fetch(`${API_URL}/api/orders${query}`, {
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to load orders.");
    }

    setOrders(Array.isArray(data) ? data : []);
  }

  async function fetchStats(month = selectedMonth) {
    const headers = await getAuthHeaders();

    const query = month ? `?month=${encodeURIComponent(month)}` : "";

    const response = await fetch(`${API_URL}/api/orders/stats${query}`, {
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to load statistics.");
    }

    setStats({
      total_orders: Number(data.total_orders || 0),
      total_products_sold: Number(data.total_products_sold || 0),
      total_earnings: Number(data.total_earnings || 0),
      cancelled_orders: Number(data.cancelled_orders || 0),
    });
  }

  async function fetchMonthlyStats() {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/api/orders/monthly-stats`, {
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to load monthly statistics.");
    }

    setMonthlyStats(Array.isArray(data) ? data : []);
  }

  async function applyMonthFilter(value) {
    setSelectedMonth(value);

    try {
      setLoading(true);

      await Promise.all([fetchOrders(value), fetchStats(value)]);
    } catch (error) {
      console.error(error);
      showError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function viewOrder(orderId) {
    try {
      setOrderLoading(true);

      const headers = await getAuthHeaders();

      const response = await fetch(`${API_URL}/api/orders/${orderId}/details`, {
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load order details.");
      }

      setSelectedOrder(data.order);
      setOrderItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error(error);
      showError(error.message);
    } finally {
      setOrderLoading(false);
    }
  }

  async function updateOrderStatus(orderId, field, value) {
    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          [field]: value,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update order status.");
      }

      showMessage("Order status updated.");

      await Promise.all([
        fetchOrders(selectedMonth),
        fetchStats(selectedMonth),
        fetchMonthlyStats(),
      ]);

      if (selectedOrder?.id === orderId) {
        setSelectedOrder(data.order);
      }
    } catch (error) {
      console.error(error);
      showError(error.message);
    }
  }

  async function deleteOrder(orderId) {
    const confirmed = window.confirm(
      "Delete this order? The product stock will be restored.",
    );

    if (!confirmed) return;

    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
        method: "DELETE",
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete order.");
      }

      showMessage("Order deleted successfully.");

      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
        setOrderItems([]);
      }

      await Promise.all([
        fetchProducts(),
        fetchOrders(selectedMonth),
        fetchStats(selectedMonth),
        fetchMonthlyStats(),
      ]);
    } catch (error) {
      console.error(error);
      showError(error.message);
    }
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  async function logout() {
    await supabase.auth.signOut();
  }

  // =========================================================
  // DERIVED DATA
  // =========================================================

  const categoryProductCounts = useMemo(() => {
    const counts = {};

    products.forEach((product) => {
      if (product.category_id) {
        counts[product.category_id] = (counts[product.category_id] || 0) + 1;
      }
    });

    return counts;
  }, [products]);

  const discountPreview = getDiscountPercentage(
    productOriginalPrice,
    productPrice,
  );

  // =========================================================
  // RENDER
  // =========================================================

  if (loading && products.length === 0 && categories.length === 0) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingCard}>
          <h2>Loading Admin Dashboard...</h2>
          <p>Please wait.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Shadow Life Garments Item</h1>

          <p style={styles.subtitle}>
            Admin Dashboard — Products, Categories, Orders & Payments
          </p>
        </div>

        <button style={styles.logoutButton} onClick={logout}>
          Logout
        </button>
      </header>

      {message && <div style={styles.successMessage}>{message}</div>}

      {errorMessage && <div style={styles.errorMessage}>{errorMessage}</div>}

      {/* =====================================================
          DASHBOARD STATISTICS
      ===================================================== */}

      <section style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Total Products</span>

          <strong style={styles.statValue}>{products.length}</strong>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>
            {selectedMonth ? "Orders This Month" : "Total Orders"}
          </span>

          <strong style={styles.statValue}>{stats.total_orders}</strong>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>Products Sold</span>

          <strong style={styles.statValue}>{stats.total_products_sold}</strong>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>Total Earnings</span>

          <strong style={styles.statValue}>
            {formatMoney(stats.total_earnings)}
          </strong>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>Cancelled Orders</span>

          <strong style={styles.statValue}>{stats.cancelled_orders}</strong>
        </div>
      </section>

      {/* =====================================================
          ORDER MONTH FILTER
      ===================================================== */}

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Order Statistics</h2>

            <p style={styles.sectionDescription}>
              Filter orders and statistics by month.
            </p>
          </div>

          <div style={styles.filterBox}>
            <label style={styles.smallLabel}>Select Month</label>

            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => applyMonthFilter(event.target.value)}
              style={styles.input}
            />

            {selectedMonth && (
              <button
                style={styles.secondaryButton}
                onClick={() => applyMonthFilter("")}
              >
                Show All
              </button>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          CATEGORY MANAGEMENT
      ===================================================== */}

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Category Management</h2>

            <p style={styles.sectionDescription}>
              Add categories here and they will become available throughout the
              store.
            </p>
          </div>
        </div>

        <form onSubmit={saveCategory} style={styles.inlineForm}>
          <input
            type="text"
            placeholder="Category name"
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            style={styles.input}
          />

          <button
            type="submit"
            style={styles.primaryButton}
            disabled={categorySaving}
          >
            {categorySaving
              ? "Saving..."
              : editingCategoryId
                ? "Update Category"
                : "Add Category"}
          </button>

          {editingCategoryId && (
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => {
                setEditingCategoryId(null);
                setCategoryName("");
              }}
            >
              Cancel
            </button>
          )}
        </form>

        <div style={styles.categoryGrid}>
          {categories.map((category) => {
            const count = categoryProductCounts[category.id] || 0;

            return (
              <div key={category.id} style={styles.categoryCard}>
                <div>
                  <strong>{category.name}</strong>

                  <span style={styles.categoryCount}>
                    {count} {count === 1 ? "product" : "products"}
                  </span>
                </div>

                <div style={styles.buttonRow}>
                  <button
                    style={styles.editButton}
                    onClick={() => editCategory(category)}
                  >
                    Edit
                  </button>

                  <button
                    style={styles.deleteButton}
                    onClick={() => deleteCategory(category)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}

          {categories.length === 0 && <p>No categories found.</p>}
        </div>
      </section>

      {/* =====================================================
          PRODUCT FORM
      ===================================================== */}

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>
              {editingProductId ? "Edit Product" : "Add New Product"}
            </h2>

            <p style={styles.sectionDescription}>
              Add pricing, discount, images, sizes and stock.
            </p>
          </div>

          {editingProductId && (
            <button style={styles.secondaryButton} onClick={resetProductForm}>
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={saveProduct} style={styles.productForm}>
          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label>Product Name</label>

              <input
                type="text"
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                placeholder="Example: Premium T-Shirt"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label>Category</label>

              <select
                value={productCategoryId}
                onChange={(event) => setProductCategoryId(event.target.value)}
                style={styles.input}
              >
                <option value="">Select a category</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label>Selling Price (৳)</label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={productPrice}
                onChange={(event) => setProductPrice(event.target.value)}
                placeholder="800"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label>Original Price (৳)</label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={productOriginalPrice}
                onChange={(event) =>
                  setProductOriginalPrice(event.target.value)
                }
                placeholder="1000"
                style={styles.input}
              />

              {discountPreview > 0 && (
                <small style={styles.discountPreview}>
                  {discountPreview}% OFF
                </small>
              )}
            </div>

            <div style={styles.field}>
              <label>General Stock</label>

              <input
                type="number"
                min="0"
                step="1"
                value={productStock}
                onChange={(event) => setProductStock(event.target.value)}
                placeholder="20"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label>Description</label>

              <textarea
                value={productDescription}
                onChange={(event) => setProductDescription(event.target.value)}
                placeholder="Product description"
                style={styles.textarea}
                rows={4}
              />
            </div>
          </div>

          {/* =================================================
              SIZES
          ================================================= */}

          <div style={styles.subsection}>
            <h3 style={styles.subsectionTitle}>Product Sizes</h3>

            <p style={styles.sectionDescription}>
              Add size-specific stock. Leave empty if the product has no sizes.
            </p>

            <div style={styles.quickSizeRow}>
              {SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  style={styles.sizeButton}
                  onClick={() => addQuickSize(size)}
                >
                  + {size}
                </button>
              ))}
            </div>

            <div style={styles.inlineForm}>
              <input
                type="text"
                placeholder="Size"
                value={sizeName}
                onChange={(event) => setSizeName(event.target.value)}
                style={styles.inputSmall}
              />

              <input
                type="number"
                min="0"
                step="1"
                placeholder="Stock"
                value={sizeStock}
                onChange={(event) => setSizeStock(event.target.value)}
                style={styles.inputSmall}
              />

              <button
                type="button"
                style={styles.primaryButton}
                onClick={addSizeRow}
              >
                Add Size
              </button>
            </div>

            {productSizes.length > 0 && (
              <div style={styles.sizeList}>
                {productSizes.map((item, index) => (
                  <div key={`${item.size}-${index}`} style={styles.sizeRow}>
                    <strong>{item.size}</strong>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={item.stock}
                      onChange={(event) =>
                        updateSizeStock(index, event.target.value)
                      }
                      style={styles.inputSmall}
                    />

                    <button
                      type="button"
                      style={styles.deleteButton}
                      onClick={() => removeSizeRow(index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* =================================================
              MULTIPLE IMAGES
          ================================================= */}

          <div style={styles.subsection}>
            <h3 style={styles.subsectionTitle}>Product Images</h3>

            <p style={styles.sectionDescription}>
              You can select multiple JPG, PNG or WEBP images. Maximum 10 images
              per upload.
            </p>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              multiple
              onChange={(event) => {
                const files = Array.from(event.target.files || []);

                if (files.length > 10) {
                  showError("You can select a maximum of 10 images.");
                  setProductImages(files.slice(0, 10));
                  return;
                }

                setProductImages(files);
              }}
              style={styles.fileInput}
            />

            {productImages.length > 0 && (
              <p style={styles.fileInfo}>
                {productImages.length} new image(s) selected.
              </p>
            )}

            {existingImages.length > 0 && (
              <div style={styles.imageGrid}>
                {existingImages.map((image) => (
                  <div key={image.id} style={styles.imageCard}>
                    <img
                      src={image.image_url}
                      alt="Product"
                      style={styles.thumbnail}
                    />

                    <button
                      type="button"
                      style={styles.smallDeleteButton}
                      onClick={() => deleteExistingImage(image)}
                    >
                      Delete
                    </button>

                    <button
                      type="button"
                      style={styles.smallButton}
                      onClick={() => setMainImageUrl(image.image_url)}
                    >
                      {mainImageUrl === image.image_url
                        ? "Main Image"
                        : "Set Main"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            style={styles.submitButton}
            disabled={productSaving}
          >
            {productSaving
              ? "Saving Product..."
              : editingProductId
                ? "Update Product"
                : "Add Product"}
          </button>
        </form>
      </section>

      {/* =====================================================
          ORDERS
      ===================================================== */}

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Orders</h2>

            <p style={styles.sectionDescription}>
              {selectedMonth
                ? `Showing orders for ${selectedMonth}.`
                : "Showing all orders."}
            </p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div style={styles.emptyBox}>No orders found.</div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Payment Status</th>
                  <th>Order Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <code style={styles.orderId}>{order.id}</code>
                    </td>

                    <td>
                      <strong>{order.customer_name}</strong>

                      <div style={styles.mutedText}>📞 {order.phone}</div>

                      {order.district && (
                        <div style={styles.mutedText}>📍 {order.district}</div>
                      )}

                      {order.email && (
                        <div style={styles.mutedText}>✉️ {order.email}</div>
                      )}
                    </td>

                    <td>
                      <strong>{formatMoney(order.total_amount)}</strong>

                      {order.delivery_charge !== undefined && (
                        <div style={styles.mutedText}>
                          Delivery: {formatMoney(order.delivery_charge)}
                        </div>
                      )}
                    </td>

                    <td>
                      {paymentLabel(order.payment_method)}

                      {order.payment_phone && (
                        <div style={styles.mutedText}>
                          📱 {order.payment_phone}
                        </div>
                      )}

                      {order.transaction_id && (
                        <div style={styles.mutedText}>
                          TX: {order.transaction_id}
                        </div>
                      )}
                    </td>

                    <td>
                      <select
                        value={order.payment_status || "unpaid"}
                        onChange={(event) =>
                          updateOrderStatus(
                            order.id,
                            "payment_status",
                            event.target.value,
                          )
                        }
                        className={statusClass(order.payment_status)}
                        style={styles.statusSelect}
                      >
                        {PAYMENT_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <select
                        value={order.status || "pending"}
                        onChange={(event) =>
                          updateOrderStatus(
                            order.id,
                            "status",
                            event.target.value,
                          )
                        }
                        className={statusClass(order.status)}
                        style={styles.statusSelect}
                      >
                        {ORDER_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>{formatDate(order.created_at)}</td>

                    <td>
                      <div style={styles.buttonRow}>
                        <button
                          style={styles.viewButton}
                          onClick={() => viewOrder(order.id)}
                        >
                          View
                        </button>

                        <button
                          style={styles.deleteButton}
                          onClick={() => deleteOrder(order.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* =====================================================
          MONTHLY STATISTICS
      ===================================================== */}

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Monthly Statistics</h2>

        {monthlyStats.length === 0 ? (
          <div style={styles.emptyBox}>No monthly statistics available.</div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Orders</th>
                  <th>Products Sold</th>
                  <th>Earnings</th>
                </tr>
              </thead>

              <tbody>
                {monthlyStats.map((item) => (
                  <tr key={item.month}>
                    <td>
                      <strong>{item.month}</strong>
                    </td>

                    <td>{item.orders}</td>

                    <td>{item.products_sold}</td>

                    <td>
                      <strong>{formatMoney(item.earnings)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* =====================================================
          ORDER DETAILS
      ===================================================== */}

      {selectedOrder && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>Order Details</h2>

                <code style={styles.orderId}>{selectedOrder.id}</code>
              </div>

              <button
                style={styles.closeButton}
                onClick={() => {
                  setSelectedOrder(null);
                  setOrderItems([]);
                }}
              >
                ×
              </button>
            </div>

            {orderLoading ? (
              <p>Loading order...</p>
            ) : (
              <>
                <div style={styles.detailGrid}>
                  <div style={styles.detailCard}>
                    <h3>Customer Information</h3>

                    <p>
                      <strong>Name:</strong> {selectedOrder.customer_name}
                    </p>

                    <p>
                      <strong>Phone:</strong> {selectedOrder.phone}
                    </p>

                    <p>
                      <strong>Email:</strong> {selectedOrder.email || "-"}
                    </p>

                    <p>
                      <strong>District:</strong> {selectedOrder.district || "-"}
                    </p>

                    <p>
                      <strong>Address:</strong> {selectedOrder.address}
                    </p>
                  </div>

                  <div style={styles.detailCard}>
                    <h3>Delivery Information</h3>

                    <p>
                      <strong>Method:</strong>{" "}
                      {deliveryLabel(selectedOrder.delivery_method)}
                    </p>

                    <p>
                      <strong>Charge:</strong>{" "}
                      {formatMoney(selectedOrder.delivery_charge)}
                    </p>

                    <p>
                      <strong>Notes:</strong> {selectedOrder.order_notes || "-"}
                    </p>
                  </div>

                  <div style={styles.detailCard}>
                    <h3>Payment Information</h3>

                    <p>
                      <strong>Method:</strong>{" "}
                      {paymentLabel(selectedOrder.payment_method)}
                    </p>

                    <p>
                      <strong>Payment Status:</strong>{" "}
                      {selectedOrder.payment_status || "-"}
                    </p>

                    <p>
                      <strong>Payment Phone:</strong>{" "}
                      {selectedOrder.payment_phone || "-"}
                    </p>

                    <p>
                      <strong>Transaction ID:</strong>{" "}
                      {selectedOrder.transaction_id || "-"}
                    </p>
                  </div>

                  <div style={styles.detailCard}>
                    <h3>Order Information</h3>

                    <p>
                      <strong>Status:</strong> {selectedOrder.status}
                    </p>

                    <p>
                      <strong>Date:</strong>{" "}
                      {formatDate(selectedOrder.created_at)}
                    </p>
                  </div>
                </div>

                <h3 style={styles.subsectionTitle}>Ordered Products</h3>

                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Size</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Original</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>

                    <tbody>
                      {orderItems.map((item) => {
                        const currentPrice = Number(item.price || 0);

                        const originalPrice =
                          item.original_price !== null &&
                          item.original_price !== undefined
                            ? Number(item.original_price)
                            : null;

                        const subtotal =
                          currentPrice * Number(item.quantity || 0);

                        return (
                          <tr key={item.id}>
                            <td>
                              <div style={styles.productOrderCell}>
                                {item.image_url && (
                                  <img
                                    src={item.image_url}
                                    alt={item.product_name}
                                    style={styles.orderImage}
                                  />
                                )}

                                <span>{item.product_name}</span>
                              </div>
                            </td>

                            <td>{item.size || "-"}</td>

                            <td>{item.quantity}</td>

                            <td>{formatMoney(currentPrice)}</td>

                            <td>
                              {originalPrice !== null &&
                              originalPrice > currentPrice ? (
                                <span style={styles.oldPrice}>
                                  {formatMoney(originalPrice)}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>

                            <td>
                              <strong>{formatMoney(subtotal)}</strong>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={styles.totalBox}>
                  <div style={styles.deliveryTotalRow}>
                    <span>Delivery</span>

                    <strong>
                      {formatMoney(selectedOrder.delivery_charge)}
                    </strong>
                  </div>

                  <div style={styles.grandTotal}>
                    <span>Total</span>

                    <strong>{formatMoney(selectedOrder.total_amount)}</strong>
                  </div>
                </div>

                <div style={styles.modalActions}>
                  <button
                    style={styles.deleteButton}
                    onClick={() => deleteOrder(selectedOrder.id)}
                  >
                    Delete Order
                  </button>

                  <button
                    style={styles.secondaryButton}
                    onClick={() => {
                      setSelectedOrder(null);
                      setOrderItems([]);
                    }}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          PRODUCT CATALOG
      ===================================================== */}

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Product Catalog</h2>

        {products.length === 0 ? (
          <div style={styles.emptyBox}>No products found.</div>
        ) : (
          <div style={styles.productGrid}>
            {products.map((product) => {
              const discount = getDiscountPercentage(
                product.original_price,
                product.price,
              );

              const category = categories.find(
                (item) => item.id === product.category_id,
              );

              return (
                <div key={product.id} style={styles.productCard}>
                  <div style={styles.productImageWrapper}>
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        style={styles.productImage}
                      />
                    ) : (
                      <div style={styles.noImage}>No Image</div>
                    )}
                  </div>

                  <div style={styles.productInfo}>
                    <div style={styles.productTopRow}>
                      <h3 style={styles.productName}>{product.name}</h3>

                      {discount > 0 && (
                        <span style={styles.discountBadge}>
                          {discount}% OFF
                        </span>
                      )}
                    </div>

                    {category && (
                      <div style={styles.categoryTag}>{category.name}</div>
                    )}

                    <p style={styles.productDescription}>
                      {product.description || "No description"}
                    </p>

                    <div style={styles.priceRow}>
                      {product.original_price &&
                      Number(product.original_price) > Number(product.price) ? (
                        <span style={styles.oldPrice}>
                          {formatMoney(product.original_price)}
                        </span>
                      ) : null}

                      <strong style={styles.currentPrice}>
                        {formatMoney(product.price)}
                      </strong>
                    </div>

                    <p style={styles.stockText}>Stock: {product.stock}</p>

                    <div style={styles.buttonRow}>
                      <button
                        style={styles.editButton}
                        onClick={() => editProduct(product)}
                      >
                        Edit
                      </button>

                      <button
                        style={styles.deleteButton}
                        onClick={() => deleteProduct(product.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f6f8",
    color: "#1f2937",
    paddingBottom: "60px",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f6f8",
    fontFamily: "system-ui, sans-serif",
  },

  loadingCard: {
    background: "#fff",
    padding: "35px",
    borderRadius: "16px",
    boxShadow: "0 10px 35px rgba(0,0,0,0.08)",
    textAlign: "center",
    color: "#111827",
  },

  header: {
    background: "#111827",
    color: "#fff",
    padding: "24px 5%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    flexWrap: "wrap",
  },

  title: {
    margin: 0,
    fontSize: "clamp(22px, 4vw, 32px)",
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#d1d5db",
    fontSize: "14px",
  },

  logoutButton: {
    border: "1px solid #ef4444",
    background: "transparent",
    color: "#fff",
    padding: "10px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
  },

  successMessage: {
    margin: "20px 5% 0",
    background: "#dcfce7",
    color: "#166534",
    padding: "13px 16px",
    borderRadius: "10px",
    border: "1px solid #bbf7d0",
  },

  errorMessage: {
    margin: "20px 5% 0",
    background: "#fee2e2",
    color: "#991b1b",
    padding: "13px 16px",
    borderRadius: "10px",
    border: "1px solid #fecaca",
  },

  statsGrid: {
    width: "90%",
    maxWidth: "1400px",
    margin: "25px auto 0",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
  },

  statCard: {
    background: "#fff",
    borderRadius: "14px",
    padding: "22px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
    border: "1px solid #e5e7eb",
  },

  statLabel: {
    display: "block",
    color: "#6b7280",
    fontSize: "13px",
    marginBottom: "8px",
  },

  statValue: {
    display: "block",
    fontSize: "27px",
    color: "#111827",
  },

  section: {
    width: "90%",
    maxWidth: "1400px",
    margin: "25px auto 0",
    background: "#fff",
    padding: "24px",
    borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
    border: "1px solid #e5e7eb",
    boxSizing: "border-box",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "22px",
    color: "#111827",
  },

  sectionDescription: {
    margin: "6px 0 0",
    color: "#6b7280",
    fontSize: "14px",
    lineHeight: 1.5,
  },

  subsection: {
    marginTop: "28px",
    paddingTop: "24px",
    borderTop: "1px solid #e5e7eb",
  },

  subsectionTitle: {
    margin: "0 0 10px",
    fontSize: "17px",
    color: "#111827",
  },

  smallLabel: {
    display: "block",
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "5px",
  },

  filterBox: {
    display: "flex",
    alignItems: "end",
    gap: "10px",
    flexWrap: "wrap",
  },

  inlineForm: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "18px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    color: "#111827",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    background: "#fff",
    color: "#111827",
    caretColor: "#111827",
    outline: "none",
  },

  inputSmall: {
    width: "130px",
    boxSizing: "border-box",
    padding: "10px 11px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    background: "#fff",
    color: "#111827",
    caretColor: "#111827",
    outline: "none",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    resize: "vertical",
    fontFamily: "inherit",
    background: "#fff",
    color: "#111827",
    caretColor: "#111827",
    outline: "none",
  },

  fileInput: {
    display: "block",
    width: "100%",
    padding: "12px",
    border: "1px dashed #9ca3af",
    borderRadius: "8px",
    background: "#f9fafb",
    color: "#111827",
    boxSizing: "border-box",
  },

  fileInfo: {
    color: "#2563eb",
    fontSize: "13px",
  },

  discountPreview: {
    color: "#dc2626",
    fontWeight: 700,
  },

  primaryButton: {
    background: "#111827",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
  },

  submitButton: {
    marginTop: "28px",
    width: "100%",
    background: "#111827",
    color: "#fff",
    border: "none",
    padding: "14px 18px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "15px",
  },

  secondaryButton: {
    background: "#f3f4f6",
    color: "#111827",
    border: "1px solid #d1d5db",
    padding: "10px 15px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
  },

  editButton: {
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    padding: "8px 12px",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: 600,
  },

  deleteButton: {
    background: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    padding: "8px 12px",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: 600,
  },

  viewButton: {
    background: "#f0fdf4",
    color: "#15803d",
    border: "1px solid #bbf7d0",
    padding: "8px 12px",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: 600,
  },

  buttonRow: {
    display: "flex",
    gap: "7px",
    flexWrap: "wrap",
  },

  categoryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "12px",
    marginTop: "20px",
  },

  categoryCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    color: "#111827",
  },

  categoryCount: {
    display: "block",
    color: "#6b7280",
    fontSize: "12px",
    marginTop: "4px",
  },

  productForm: {
    marginTop: "10px",
  },

  quickSizeRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "7px",
    marginBottom: "12px",
  },

  sizeButton: {
    border: "1px solid #d1d5db",
    background: "#f9fafb",
    color: "#111827",
    padding: "7px 11px",
    borderRadius: "7px",
    cursor: "pointer",
  },

  sizeList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "15px",
  },

  sizeRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px",
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    color: "#111827",
  },

  imageGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: "12px",
    marginTop: "18px",
  },

  imageCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "8px",
    background: "#fff",
  },

  thumbnail: {
    width: "100%",
    height: "120px",
    objectFit: "cover",
    borderRadius: "7px",
    display: "block",
    marginBottom: "7px",
  },

  smallButton: {
    width: "100%",
    marginTop: "6px",
    padding: "7px",
    border: "1px solid #d1d5db",
    background: "#f9fafb",
    color: "#111827",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
  },

  smallDeleteButton: {
    width: "100%",
    padding: "7px",
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#b91c1c",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
  },

  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "1050px",
    fontSize: "13px",
    color: "#111827",
  },

  orderId: {
    fontSize: "10px",
    color: "#6b7280",
    wordBreak: "break-all",
  },

  tableCell: {
    padding: "11px",
  },

  mutedText: {
    color: "#6b7280",
    fontSize: "11px",
    marginTop: "3px",
  },

  statusSelect: {
    padding: "7px",
    borderRadius: "7px",
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#111827",
    fontSize: "12px",
  },

  emptyBox: {
    textAlign: "center",
    padding: "35px",
    background: "#f9fafb",
    borderRadius: "10px",
    color: "#6b7280",
    marginTop: "15px",
  },

  productGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "18px",
    marginTop: "18px",
  },

  productCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    overflow: "hidden",
    background: "#fff",
  },

  productImageWrapper: {
    width: "100%",
    height: "230px",
    background: "#f3f4f6",
  },

  productImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  noImage: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#9ca3af",
  },

  productInfo: {
    padding: "16px",
    color: "#111827",
  },

  productTopRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "8px",
  },

  productName: {
    margin: 0,
    fontSize: "18px",
    color: "#111827",
  },

  categoryTag: {
    display: "inline-block",
    marginTop: "7px",
    padding: "4px 8px",
    borderRadius: "20px",
    background: "#f3f4f6",
    color: "#4b5563",
    fontSize: "11px",
  },

  discountBadge: {
    background: "#dc2626",
    color: "#fff",
    padding: "4px 7px",
    borderRadius: "5px",
    fontSize: "10px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  productDescription: {
    color: "#6b7280",
    fontSize: "13px",
    minHeight: "38px",
    lineHeight: 1.5,
  },

  priceRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "10px",
  },

  currentPrice: {
    fontSize: "20px",
    color: "#111827",
  },

  oldPrice: {
    textDecoration: "line-through",
    color: "#9ca3af",
  },

  stockText: {
    color: "#4b5563",
    fontSize: "13px",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    zIndex: 1000,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
  },

  modal: {
    width: "min(1100px, 100%)",
    maxHeight: "92vh",
    overflowY: "auto",
    background: "#fff",
    color: "#111827",
    borderRadius: "16px",
    padding: "24px",
    boxSizing: "border-box",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    marginBottom: "22px",
  },

  modalTitle: {
    margin: 0,
    fontSize: "24px",
    color: "#111827",
  },

  closeButton: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    border: "none",
    background: "#f3f4f6",
    color: "#111827",
    fontSize: "25px",
    cursor: "pointer",
  },

  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "12px",
    marginBottom: "25px",
  },

  detailCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "15px",
    background: "#fafafa",
    color: "#111827",
  },

  productOrderCell: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  orderImage: {
    width: "45px",
    height: "45px",
    objectFit: "cover",
    borderRadius: "6px",
  },

  totalBox: {
    marginTop: "20px",
    marginLeft: "auto",
    maxWidth: "350px",
    borderTop: "1px solid #e5e7eb",
    paddingTop: "15px",
  },

  deliveryTotalRow: {
    display: "flex",
    justifyContent: "space-between",
    color: "#4b5563",
  },

  grandTotal: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "12px",
    paddingTop: "12px",
    borderTop: "1px solid #d1d5db",
    fontSize: "20px",
    color: "#111827",
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "25px",
  },
};
