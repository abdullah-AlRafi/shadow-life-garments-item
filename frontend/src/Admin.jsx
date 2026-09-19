import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Admin() {
  // =========================
  // PRODUCT STATES
  // =========================
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageFile, setImageFile] = useState(null);

  const [editingId, setEditingId] = useState(null);

  // =========================
  // ORDER STATES
  // =========================
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);

  // =========================
  // LOAD DATA
  // =========================
  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchOrders();
  }, []);

  // =========================
  // LOGOUT
  // =========================
  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to logout?");

    if (!confirmed) {
      return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      alert("Could not logout. Please try again.");
      return;
    }

    window.location.href = "/admin";
  };

  // =========================
  // GET AUTHORIZATION HEADER
  // =========================
  const getAuthHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error("You are not logged in.");
    }

    return {
      Authorization: `Bearer ${session.access_token}`,
    };
  };

  // =========================
  // FETCH PRODUCTS
  // =========================
  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/products`);
      const data = await response.json();

      if (response.ok) {
        setProducts(data);
      } else {
        console.error(data);
      }
    } catch (error) {
      console.error("Products fetch error:", error);
    }
  };

  // =========================
  // FETCH CATEGORIES
  // =========================
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/categories`);
      const data = await response.json();

      if (response.ok) {
        setCategories(data);
      } else {
        console.error(data);
      }
    } catch (error) {
      console.error("Categories fetch error:", error);
    }
  };

  // =========================
  // FETCH ORDERS
  // =========================
  const fetchOrders = async () => {
    try {
      const authHeaders = await getAuthHeaders();

      const response = await fetch(`${API_URL}/api/orders`, {
        headers: authHeaders,
      });

      const data = await response.json();

      if (response.ok) {
        setOrders(data);
      } else {
        console.error(data);
      }
    } catch (error) {
      console.error("Orders fetch error:", error);
    }
  };

  // =========================
  // RESET PRODUCT FORM
  // =========================
  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setStock("");
    setCategoryId("");
    setImageFile(null);
    setEditingId(null);

    const fileInput = document.getElementById("product-image");

    if (fileInput) {
      fileInput.value = "";
    }
  };

  // =========================
  // IMAGE UPLOAD
  // =========================
  const uploadImage = async () => {
    if (!imageFile) {
      return null;
    }

    try {
      const fileName = `${Date.now()}-${imageFile.name}`;

      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("fileName", fileName);

      const authHeaders = await getAuthHeaders();

      const response = await fetch(`${API_URL}/api/upload-image`, {
        method: "POST",
        headers: authHeaders,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Image upload failed");
      }

      return data.url;
    } catch (error) {
      console.error("Image upload error:", error);
      alert("Image upload failed.");
      return null;
    }
  };

  // =========================
  // ADD / UPDATE PRODUCT
  // =========================
  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      let imageUrl = null;

      if (imageFile) {
        imageUrl = await uploadImage();

        if (!imageUrl) {
          return;
        }
      }

      const productData = {
        name,
        description,
        price: Number(price),
        stock: Number(stock),
        category_id: categoryId || null,
      };

      if (imageUrl) {
        productData.image_url = imageUrl;
      }

      const url = editingId
        ? `${API_URL}/api/products/${editingId}`
        : `${API_URL}/api/products`;

      const method = editingId ? "PUT" : "POST";

      const authHeaders = await getAuthHeaders();

      const response = await fetch(url, {
        method,
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Product operation failed.");
        return;
      }

      alert(
        editingId
          ? "Product updated successfully!"
          : "Product added successfully!",
      );

      resetForm();
      fetchProducts();
    } catch (error) {
      console.error("Product save error:", error);
      alert(error.message || "Something went wrong.");
    }
  };

  // =========================
  // EDIT PRODUCT
  // =========================
  const handleEdit = (product) => {
    setEditingId(product.id);
    setName(product.name || "");
    setDescription(product.description || "");
    setPrice(product.price || "");
    setStock(product.stock || "");
    setCategoryId(product.category_id || "");
    setImageFile(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================
  // DELETE PRODUCT
  // =========================
  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?",
    );

    if (!confirmed) {
      return;
    }

    try {
      const authHeaders = await getAuthHeaders();

      const response = await fetch(`${API_URL}/api/products/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Delete failed.");
        return;
      }

      alert("Product deleted successfully!");

      fetchProducts();
    } catch (error) {
      console.error("Delete error:", error);
      alert(error.message || "Something went wrong.");
    }
  };

  // =========================
  // VIEW ORDER DETAILS
  // =========================
  const handleViewOrder = async (orderId) => {
    try {
      const authHeaders = await getAuthHeaders();

      const response = await fetch(`${API_URL}/api/orders/${orderId}/details`, {
        headers: authHeaders,
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Could not load order details.");
        return;
      }

      setSelectedOrder(data.order);
      setOrderItems(data.items || []);

      setTimeout(() => {
        const element = document.getElementById("order-details");

        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
          });
        }
      }, 100);
    } catch (error) {
      console.error("Order details error:", error);
      alert(error.message || "Could not load order details.");
    }
  };

  // =========================
  // UPDATE ORDER STATUS
  // =========================
  const updateOrderStatus = async (orderId, status) => {
    try {
      const authHeaders = await getAuthHeaders();

      const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Could not update order status.");
        return;
      }

      fetchOrders();

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          status,
        });
      }
    } catch (error) {
      console.error("Order status update error:", error);
      alert(error.message || "Could not update order status.");
    }
  };

  // =========================
  // UPDATE PAYMENT STATUS
  // =========================
  const updatePaymentStatus = async (orderId, paymentStatus) => {
    try {
      const authHeaders = await getAuthHeaders();

      const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_status: paymentStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Could not update payment status.");
        return;
      }

      fetchOrders();

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          payment_status: paymentStatus,
        });
      }
    } catch (error) {
      console.error("Payment status update error:", error);
      alert(error.message || "Could not update payment status.");
    }
  };

  // =========================
  // HELPER FUNCTIONS
  // =========================
  const getOrderStatusClass = (status) => {
    return `status-badge status-${status || "pending"}`;
  };

  const getPaymentStatusClass = (status) => {
    return `status-badge payment-${status || "unpaid"}`;
  };

  const pendingOrders = orders.filter(
    (order) => order.status === "pending",
  ).length;

  const deliveredOrders = orders.filter(
    (order) => order.status === "delivered",
  ).length;

  const totalSales = orders
    .filter((order) => order.status !== "cancelled")
    .reduce((total, order) => total + Number(order.total_amount || 0), 0);

  // =========================
  // FORMAT DATE
  // =========================
  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleString("en-BD", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  // =========================
  // FORMAT PAYMENT METHOD
  // =========================
  const formatPaymentMethod = (method) => {
    if (!method) return "-";

    if (method === "cash_on_delivery") {
      return "Cash on Delivery";
    }

    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  return (
    <div className="admin-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .admin-page {
          min-height: 100vh;
          background: #f4f6f8;
          padding: 30px;
          color: #111827;
          font-family: Arial, Helvetica, sans-serif;
        }

        .admin-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .admin-header {
          background: white;
          border-radius: 16px;
          padding: 25px 30px;
          margin-bottom: 25px;
          box-shadow: 0 3px 15px rgba(0, 0, 0, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .admin-header h1 {
          margin: 0;
          font-size: 30px;
          color: #111827;
        }

        .admin-header p {
          margin: 8px 0 0;
          color: #6b7280;
          font-size: 14px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
          margin-bottom: 25px;
        }

        .summary-card {
          background: white;
          padding: 22px;
          border-radius: 14px;
          box-shadow: 0 3px 15px rgba(0, 0, 0, 0.05);
        }

        .summary-card h3 {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
          font-weight: 500;
        }

        .summary-card .number {
          margin-top: 8px;
          font-size: 28px;
          font-weight: 700;
          color: #111827;
        }

        .section-card {
          background: white;
          border-radius: 16px;
          padding: 25px;
          margin-bottom: 25px;
          box-shadow: 0 3px 15px rgba(0, 0, 0, 0.05);
        }

        .section-title {
          margin: 0 0 20px;
          font-size: 21px;
          color: #111827;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group.full {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 7px;
          color: #374151;
        }

        .form-input,
        .form-textarea,
        .form-select {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 9px;
          padding: 11px 12px;
          font-size: 14px;
          outline: none;
          background: #ffffff;
          color: #111827;
          transition: border 0.2s, box-shadow 0.2s;
        }

        select,
        select.form-select,
        select.status-select,
        select option {
          color: #111827 !important;
          background-color: #ffffff !important;
        }

        .form-input:focus,
        .form-textarea:focus,
        .form-select:focus {
          border-color: #111827;
          box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
        }

        .form-textarea {
          min-height: 100px;
          resize: vertical;
        }

        .form-file {
          width: 100%;
          padding: 10px;
          border: 1px dashed #cbd5e1;
          border-radius: 9px;
          background: #f8fafc;
          color: #374151;
        }

        .button-row {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .btn {
          border: none;
          border-radius: 9px;
          padding: 11px 18px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }

        .btn-primary {
          background: #111827;
          color: white;
        }

        .btn-primary:hover {
          background: #000000;
        }

        .btn-secondary {
          background: #e5e7eb;
          color: #111827;
        }

        .btn-secondary:hover {
          background: #d1d5db;
        }

        .btn-danger {
          background: #fee2e2;
          color: #b91c1c;
        }

        .btn-danger:hover {
          background: #fecaca;
        }

        .btn-logout {
          background: #fee2e2;
          color: #b91c1c;
          white-space: nowrap;
        }

        .btn-logout:hover {
          background: #fecaca;
        }

        .btn-small {
          padding: 7px 11px;
          font-size: 12px;
        }

        .table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1100px;
        }

        .admin-table th {
          text-align: left;
          padding: 13px 12px;
          background: #f8fafc;
          color: #374151;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          border-bottom: 1px solid #e5e7eb;
        }

        .admin-table td {
          padding: 14px 12px;
          border-bottom: 1px solid #eef0f2;
          color: #374151;
          font-size: 13px;
          vertical-align: top;
        }

        .admin-table tr:hover td {
          background: #fafafa;
        }

        .status-select {
          min-width: 125px;
          border: 1px solid #d1d5db;
          border-radius: 7px;
          padding: 7px 8px;
          font-size: 12px;
          color: #111827 !important;
          background: #ffffff !important;
          outline: none;
        }

        .status-badge {
          display: inline-block;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          text-transform: capitalize;
        }

        .status-pending {
          background: #fef3c7;
          color: #92400e;
        }

        .status-confirmed {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .status-processing {
          background: #e0e7ff;
          color: #4338ca;
        }

        .status-shipped {
          background: #ede9fe;
          color: #6d28d9;
        }

        .status-delivered {
          background: #dcfce7;
          color: #166534;
        }

        .status-cancelled {
          background: #fee2e2;
          color: #b91c1c;
        }

        .payment-unpaid {
          background: #f3f4f6;
          color: #374151;
        }

        .payment-pending {
          background: #fef3c7;
          color: #92400e;
        }

        .payment-paid {
          background: #dcfce7;
          color: #166534;
        }

        .payment-rejected {
          background: #fee2e2;
          color: #b91c1c;
        }

        .customer-info strong {
          display: block;
          color: #111827;
          margin-bottom: 4px;
        }

        .customer-info span {
          display: block;
          color: #6b7280;
          font-size: 12px;
          margin-bottom: 3px;
        }

        .order-id {
          font-family: monospace;
          font-size: 11px;
          color: #6b7280;
          word-break: break-all;
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }

        .product-card {
          border: 1px solid #e5e7eb;
          border-radius: 13px;
          overflow: hidden;
          background: white;
        }

        .product-image {
          width: 100%;
          height: 220px;
          object-fit: cover;
          display: block;
          background: #f3f4f6;
        }

        .no-image {
          width: 100%;
          height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          color: #9ca3af;
          font-size: 13px;
        }

        .product-info {
          padding: 15px;
        }

        .product-info h3 {
          margin: 0 0 7px;
          color: #111827;
          font-size: 16px;
        }

        .product-description {
          color: #6b7280;
          font-size: 12px;
          line-height: 1.5;
          min-height: 36px;
          margin-bottom: 10px;
        }

        .product-meta {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 13px;
        }

        .product-price {
          font-weight: 700;
          color: #111827;
        }

        .product-stock {
          color: #6b7280;
          font-size: 12px;
        }

        .product-actions {
          display: flex;
          gap: 8px;
        }

        .product-actions .btn {
          flex: 1;
        }

        .order-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }

        .detail-box {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 15px;
          background: #fafafa;
        }

        .detail-box h4 {
          margin: 0 0 10px;
          font-size: 13px;
          color: #111827;
        }

        .detail-box p {
          margin: 5px 0;
          color: #6b7280;
          font-size: 13px;
        }

        .detail-box strong {
          color: #111827;
        }

        .order-total {
          display: flex;
          justify-content: flex-end;
          margin-top: 15px;
          font-size: 20px;
          font-weight: 700;
          color: #111827;
        }

        .empty-state {
          padding: 35px;
          text-align: center;
          color: #6b7280;
          border: 1px dashed #d1d5db;
          border-radius: 10px;
        }

        @media (max-width: 1100px) {
          .summary-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .product-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 700px) {
          .admin-page {
            padding: 15px;
          }

          .admin-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-group.full {
            grid-column: auto;
          }

          .summary-grid {
            grid-template-columns: 1fr;
          }

          .product-grid {
            grid-template-columns: 1fr;
          }

          .order-details-grid {
            grid-template-columns: 1fr;
          }

          .admin-header h1 {
            font-size: 24px;
          }
        }
      `}</style>

      <div className="admin-container">
        {/* HEADER */}
        <div className="admin-header">
          <div>
            <h1>Shadow Life Garments Item</h1>
            <p>Admin Dashboard — Products, Orders & Payments</p>
          </div>

          <button className="btn btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="summary-grid">
          <div className="summary-card">
            <h3>Total Products</h3>
            <div className="number">{products.length}</div>
          </div>

          <div className="summary-card">
            <h3>Total Orders</h3>
            <div className="number">{orders.length}</div>
          </div>

          <div className="summary-card">
            <h3>Pending Orders</h3>
            <div className="number">{pendingOrders}</div>
          </div>

          <div className="summary-card">
            <h3>Total Sales</h3>
            <div className="number">৳{totalSales.toLocaleString("en-BD")}</div>
          </div>
        </div>

        {/* PRODUCT FORM */}
        <div className="section-card">
          <h2 className="section-title">
            {editingId ? "Edit Product" : "Add New Product"}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Product Name</label>

                <input
                  className="form-input"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Category</label>

                <select
                  className="form-select"
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  required
                  style={{
                    color: "#111827",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <option
                    value=""
                    style={{
                      color: "#111827",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    Select a category
                  </option>

                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                      style={{
                        color: "#111827",
                        backgroundColor: "#ffffff",
                      }}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Price (৳)</label>

                <input
                  className="form-input"
                  type="number"
                  min="0"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="Enter price"
                  required
                />
              </div>

              <div className="form-group">
                <label>Stock</label>

                <input
                  className="form-input"
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(event) => setStock(event.target.value)}
                  placeholder="Enter stock quantity"
                  required
                />
              </div>

              <div className="form-group full">
                <label>Description</label>

                <textarea
                  className="form-textarea"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Enter product description"
                />
              </div>

              <div className="form-group full">
                <label>Product Image</label>

                <input
                  id="product-image"
                  className="form-file"
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setImageFile(event.target.files[0] || null)
                  }
                />
              </div>
            </div>

            <div className="button-row">
              <button className="btn btn-primary" type="submit">
                {editingId ? "Update Product" : "Add Product"}
              </button>

              {editingId && (
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={resetForm}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ORDERS */}
        <div className="section-card">
          <h2 className="section-title">Orders</h2>

          {orders.length === 0 ? (
            <div className="empty-state">No orders found.</div>
          ) : (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Payment Phone</th>
                    <th>Transaction ID</th>
                    <th>Payment Status</th>
                    <th>Order Status</th>
                    <th>Date</th>
                    <th>Details</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <div className="order-id">{order.id}</div>
                      </td>

                      <td>
                        <div className="customer-info">
                          <strong>{order.customer_name}</strong>
                          <span>📞 {order.phone}</span>
                          <span>📍 {order.address}</span>
                        </div>
                      </td>

                      <td>
                        <strong>
                          ৳
                          {Number(order.total_amount || 0).toLocaleString(
                            "en-BD",
                          )}
                        </strong>
                      </td>

                      <td>{formatPaymentMethod(order.payment_method)}</td>

                      <td>{order.payment_phone || "-"}</td>

                      <td>{order.transaction_id || "-"}</td>

                      <td>
                        <select
                          className="status-select"
                          value={order.payment_status || "unpaid"}
                          onChange={(event) =>
                            updatePaymentStatus(order.id, event.target.value)
                          }
                          style={{
                            color: "#111827",
                            backgroundColor: "#ffffff",
                          }}
                        >
                          <option value="unpaid">Unpaid</option>
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>

                      <td>
                        <select
                          className="status-select"
                          value={order.status || "pending"}
                          onChange={(event) =>
                            updateOrderStatus(order.id, event.target.value)
                          }
                          style={{
                            color: "#111827",
                            backgroundColor: "#ffffff",
                          }}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>

                      <td>{formatDate(order.created_at)}</td>

                      <td>
                        <button
                          className="btn btn-primary btn-small"
                          onClick={() => handleViewOrder(order.id)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ORDER DETAILS */}
        {selectedOrder && (
          <div className="section-card" id="order-details">
            <h2 className="section-title">Order Details</h2>

            <div className="order-details-grid">
              <div className="detail-box">
                <h4>Customer Information</h4>

                <p>
                  <strong>Name:</strong> {selectedOrder.customer_name}
                </p>

                <p>
                  <strong>Phone:</strong> {selectedOrder.phone}
                </p>

                <p>
                  <strong>Address:</strong> {selectedOrder.address}
                </p>
              </div>

              <div className="detail-box">
                <h4>Payment Information</h4>

                <p>
                  <strong>Method:</strong>{" "}
                  {formatPaymentMethod(selectedOrder.payment_method)}
                </p>

                <p>
                  <strong>Payment Phone:</strong>{" "}
                  {selectedOrder.payment_phone || "-"}
                </p>

                <p>
                  <strong>Transaction ID:</strong>{" "}
                  {selectedOrder.transaction_id || "-"}
                </p>

                <p>
                  <strong>Payment Status:</strong>{" "}
                  <span
                    className={getPaymentStatusClass(
                      selectedOrder.payment_status,
                    )}
                  >
                    {selectedOrder.payment_status || "unpaid"}
                  </span>
                </p>
              </div>

              <div className="detail-box">
                <h4>Order Information</h4>

                <p>
                  <strong>Order ID:</strong>{" "}
                  <span className="order-id">{selectedOrder.id}</span>
                </p>

                <p>
                  <strong>Order Status:</strong>{" "}
                  <span className={getOrderStatusClass(selectedOrder.status)}>
                    {selectedOrder.status || "pending"}
                  </span>
                </p>

                <p>
                  <strong>Created:</strong>{" "}
                  {formatDate(selectedOrder.created_at)}
                </p>
              </div>
            </div>

            <h3
              style={{
                marginBottom: "12px",
                color: "#111827",
              }}
            >
              Ordered Products
            </h3>

            {orderItems.length === 0 ? (
              <div className="empty-state">No order items found.</div>
            ) : (
              <div className="table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>

                  <tbody>
                    {orderItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>
                            {item.product_name || "Product unavailable"}
                          </strong>
                        </td>

                        <td>{item.quantity}</td>

                        <td>
                          ৳{Number(item.price || 0).toLocaleString("en-BD")}
                        </td>

                        <td>
                          ৳
                          {(
                            Number(item.price || 0) * Number(item.quantity || 0)
                          ).toLocaleString("en-BD")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="order-total">
              Total: ৳
              {Number(selectedOrder.total_amount || 0).toLocaleString("en-BD")}
            </div>
          </div>
        )}

        {/* PRODUCT CATALOG */}
        <div className="section-card">
          <h2 className="section-title">Product Catalog</h2>

          {products.length === 0 ? (
            <div className="empty-state">No products found.</div>
          ) : (
            <div className="product-grid">
              {products.map((product) => (
                <div className="product-card" key={product.id}>
                  {product.image_url ? (
                    <img
                      className="product-image"
                      src={product.image_url}
                      alt={product.name}
                    />
                  ) : (
                    <div className="no-image">No Image</div>
                  )}

                  <div className="product-info">
                    <h3>{product.name}</h3>

                    <div className="product-description">
                      {product.description || "No description available."}
                    </div>

                    <div className="product-meta">
                      <span className="product-price">
                        ৳{Number(product.price || 0).toLocaleString("en-BD")}
                      </span>

                      <span className="product-stock">
                        Stock: {product.stock}
                      </span>
                    </div>

                    <div className="product-actions">
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleEdit(product)}
                      >
                        Edit
                      </button>

                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(product.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Admin;
