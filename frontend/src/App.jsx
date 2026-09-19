import { useEffect, useState } from "react";
import "./App.css";

import Admin from "./Admin";
import AdminLogin from "./AdminLogin";

import { supabase } from "./supabaseClient";

// =========================
// BACKEND API URL
// =========================
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// =========================
// HELPER FUNCTIONS
// =========================
function formatMoney(value) {
  return `৳${Number(value || 0).toLocaleString("en-BD")}`;
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

function getCartKey(productId, size) {
  return `${productId}__${size || "no-size"}`;
}

// =========================
// APP
// =========================
function App() {
  // =========================
  // PRODUCTS
  // =========================
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================
  // CART
  // =========================
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);

  // =========================
  // PRODUCT DETAILS
  // =========================
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductSizes, setSelectedProductSizes] = useState([]);
  const [selectedProductImages, setSelectedProductImages] = useState([]);
  const [selectedSize, setSelectedSize] = useState("");
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [selectedImage, setSelectedImage] = useState("");

  // =========================
  // CHECKOUT
  // =========================
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // =========================
  // PAYMENT
  // =========================
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [transactionId, setTransactionId] = useState("");

  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [orderError, setOrderError] = useState("");

  // =========================
  // ADMIN AUTHENTICATION
  // =========================
  const [adminSession, setAdminSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // =========================
  // CUSTOMER AUTHENTICATION
  // =========================
  const [customerSession, setCustomerSession] = useState(null);
  const [customerAuthLoading, setCustomerAuthLoading] = useState(true);

  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");

  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // =========================
  // CUSTOMER ORDERS
  // =========================
  const [showOrders, setShowOrders] = useState(false);
  const [myOrders, setMyOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  // =========================
  // CUSTOMER PROFILE
  // =========================
  const [showProfile, setShowProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");

  const [profileData, setProfileData] = useState({
    full_name: "",
    district: "",
    home_address: "",
    email: "",
    phone: "",
  });

  // =========================
  // DELIVERY
  // =========================
  const [deliveryMethod, setDeliveryMethod] = useState("inside_dhaka");

  // =========================
  // ROUTING
  // =========================
  const isAdminPage = window.location.pathname === "/admin";

  // =========================
  // CHECK ADMIN SESSION
  // =========================
  useEffect(() => {
    if (!isAdminPage) {
      setAuthLoading(false);
      return;
    }

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setAdminSession(session);
      setAuthLoading(false);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAdminSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isAdminPage]);

  // =========================
  // CHECK CUSTOMER SESSION
  // =========================
  useEffect(() => {
    if (isAdminPage) {
      setCustomerAuthLoading(false);
      return;
    }

    const checkCustomerSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setCustomerSession(session);
      setCustomerAuthLoading(false);
    };

    checkCustomerSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "INITIAL_SESSION") {
        setCustomerSession(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isAdminPage]);

  // =========================
  // LOAD PRODUCTS
  // =========================
  useEffect(() => {
    if (isAdminPage) {
      return;
    }

    fetch(`${API_URL}/api/products`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load products");
        }

        return response.json();
      })
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [isAdminPage]);

  // =========================
  // OPEN CUSTOMER AUTH
  // =========================
  const openAuth = (mode = "login") => {
    setAuthMode(mode);
    setAuthEmail("");
    setAuthPassword("");
    setAuthName("");
    setAuthMessage("");
    setAuthError("");
    setShowAuth(true);
  };

  // =========================
  // CLOSE CUSTOMER AUTH
  // =========================
  const closeAuth = () => {
    if (!authSubmitting) {
      setShowAuth(false);
    }
  };

  // =========================
  // CUSTOMER LOGIN / SIGNUP
  // =========================
  const handleCustomerAuth = async (event) => {
    event.preventDefault();

    setAuthError("");
    setAuthMessage("");
    setAuthSubmitting(true);

    try {
      if (!authEmail.trim() || !authPassword.trim()) {
        throw new Error("Email and password are required.");
      }

      if (authMode === "signup") {
        if (!authName.trim()) {
          throw new Error("Please enter your name.");
        }

        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: {
            data: {
              full_name: authName.trim(),
            },
          },
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          setCustomerSession(data.session);
          setAuthMessage("Account created successfully.");
        } else {
          setAuthMessage(
            "Account created. Please check your email to confirm your account before logging in.",
          );
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        });

        if (error) {
          throw error;
        }

        setCustomerSession(data.session);
        setAuthMessage("Login successful.");

        setShowAuth(false);
      }
    } catch (error) {
      setAuthError(error.message || "Authentication failed.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  // =========================
  // CUSTOMER LOGOUT
  // =========================
  const handleCustomerLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setAuthError(error.message);
      return;
    }

    setCustomerSession(null);
    setMyOrders([]);
    setShowOrders(false);
    setShowProfile(false);

    setProfileData({
      full_name: "",
      district: "",
      home_address: "",
      email: "",
      phone: "",
    });
  };

  // =========================
  // GET AUTH HEADERS
  // =========================
  const getCustomerHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Please login first.");
    }

    return {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    };
  };

  // =========================
  // LOAD CUSTOMER PROFILE
  // =========================
  const loadCustomerProfile = async (openModal = false) => {
    if (!customerSession) {
      openAuth("login");
      return;
    }

    setProfileLoading(true);
    setProfileError("");
    setProfileMessage("");

    try {
      const headers = await getCustomerHeaders();

      const response = await fetch(`${API_URL}/api/profile`, {
        method: "GET",
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load your profile.");
      }

      const loadedFullName =
        data.profile?.full_name ||
        customerSession.user?.user_metadata?.full_name ||
        "";

      const loadedDistrict = data.profile?.district || "";

      const loadedAddress = data.profile?.home_address || "";

      const loadedEmail =
        data.auth_user?.email || customerSession.user?.email || "";

      // IMPORTANT:
      // Use customer_profiles.phone first.
      // Supabase Auth phone is only a fallback.
      const loadedPhone = data.profile?.phone || data.auth_user?.phone || "";

      setProfileData({
        full_name: loadedFullName,
        district: loadedDistrict,
        home_address: loadedAddress,
        email: loadedEmail,
        phone: loadedPhone,
      });

      // Automatically use saved profile information in checkout
      // when the customer has not already typed something there.
      setCustomerName((current) => current || loadedFullName);
      setPhone((current) => current || loadedPhone);
      setAddress((current) => current || loadedAddress);

      if (openModal) {
        setShowProfile(true);
      }
    } catch (error) {
      setProfileError(error.message);
    } finally {
      setProfileLoading(false);
    }
  };

  // =========================
  // SAVE CUSTOMER PROFILE
  // =========================
  const saveCustomerProfile = async (event) => {
    event.preventDefault();

    if (!profileData.full_name.trim()) {
      setProfileError("Full name is required.");
      return;
    }

    if (!profileData.phone.trim()) {
      setProfileError("Phone number is required.");
      return;
    }

    setProfileSaving(true);
    setProfileError("");
    setProfileMessage("");

    try {
      const headers = await getCustomerHeaders();

      const response = await fetch(`${API_URL}/api/profile`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          full_name: profileData.full_name.trim(),
          phone: profileData.phone.trim(),
          district: profileData.district.trim(),
          home_address: profileData.home_address.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save your profile.");
      }

      setProfileData((current) => ({
        ...current,
        full_name: data.profile?.full_name || current.full_name,
        phone: data.profile?.phone || current.phone,
        district: data.profile?.district || current.district,
        home_address: data.profile?.home_address || current.home_address,
      }));

      // Keep checkout phone synchronized with saved profile phone.
      if (data.profile?.phone) {
        setPhone(data.profile.phone);
      }

      setProfileMessage("Profile saved successfully.");
    } catch (error) {
      setProfileError(error.message);
    } finally {
      setProfileSaving(false);
    }
  };

  // =========================
  // LOAD PROFILE AFTER LOGIN
  // =========================
  useEffect(() => {
    if (!customerSession || isAdminPage) {
      return;
    }

    loadCustomerProfile(false);
  }, [customerSession, isAdminPage]);

  // =========================
  // LOAD MY ORDERS
  // =========================
  const loadMyOrders = async () => {
    if (!customerSession) {
      openAuth("login");
      return;
    }

    setOrdersLoading(true);
    setOrdersError("");

    try {
      const headers = await getCustomerHeaders();

      const response = await fetch(`${API_URL}/api/my-orders`, {
        method: "GET",
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load your orders.");
      }

      setMyOrders(Array.isArray(data) ? data : []);
      setShowOrders(true);
    } catch (error) {
      setOrdersError(error.message);
    } finally {
      setOrdersLoading(false);
    }
  };

  // =========================
  // OPEN PRODUCT DETAILS
  // =========================
  const openProductDetails = async (product) => {
    setSelectedProduct(product);
    setSelectedSize("");
    setDetailQuantity(1);
    setDetailError("");
    setSelectedProductSizes([]);
    setSelectedProductImages([]);
    setSelectedImage(product.image_url || "");
    setDetailLoading(true);

    try {
      const [sizesResponse, imagesResponse] = await Promise.all([
        fetch(`${API_URL}/api/products/${product.id}/sizes`),
        fetch(`${API_URL}/api/products/${product.id}/images`),
      ]);

      const sizesData = await sizesResponse.json();
      const imagesData = await imagesResponse.json();

      if (!sizesResponse.ok) {
        throw new Error(sizesData.error || "Failed to load product sizes.");
      }

      if (!imagesResponse.ok) {
        throw new Error(imagesData.error || "Failed to load product images.");
      }

      const sizes = Array.isArray(sizesData) ? sizesData : [];
      const images = Array.isArray(imagesData) ? imagesData : [];

      setSelectedProductSizes(sizes);

      const imageUrls = images.map((image) => image.image_url).filter(Boolean);

      if (imageUrls.length > 0) {
        setSelectedProductImages(imageUrls);
        setSelectedImage(product.image_url || imageUrls[0]);
      } else if (product.image_url) {
        setSelectedProductImages([product.image_url]);
        setSelectedImage(product.image_url);
      }
    } catch (err) {
      console.error(err);
      setDetailError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  // =========================
  // CLOSE PRODUCT DETAILS
  // =========================
  const closeProductDetails = () => {
    setSelectedProduct(null);
    setSelectedProductSizes([]);
    setSelectedProductImages([]);
    setSelectedSize("");
    setDetailQuantity(1);
    setDetailError("");
    setSelectedImage("");
  };

  // =========================
  // SELECT SIZE
  // =========================
  const handleSizeChange = (size) => {
    setSelectedSize(size);
    setDetailQuantity(1);
    setDetailError("");
  };

  // =========================
  // GET SELECTED STOCK
  // =========================
  const getSelectedStock = () => {
    if (!selectedProduct) {
      return 0;
    }

    if (selectedProductSizes.length > 0) {
      const selectedSizeData = selectedProductSizes.find(
        (item) => item.size === selectedSize,
      );

      return Number(selectedSizeData?.stock || 0);
    }

    return Number(selectedProduct.stock || 0);
  };

  // =========================
  // ADD TO CART
  // =========================
  const addToCart = (
    product,
    size = null,
    quantity = 1,
    availableStock = null,
  ) => {
    const stock =
      availableStock !== null
        ? Number(availableStock)
        : Number(product.stock || 0);

    if (stock <= 0) {
      return;
    }

    const cartKey = getCartKey(product.id, size);

    setCart((currentCart) => {
      const existingProduct = currentCart.find(
        (item) => item.cartKey === cartKey,
      );

      if (existingProduct) {
        return currentCart.map((item) =>
          item.cartKey === cartKey
            ? {
                ...item,
                quantity: Math.min(item.quantity + quantity, item.stock),
              }
            : item,
        );
      }

      return [
        ...currentCart,
        {
          ...product,
          cartKey,
          size,
          stock,
          quantity: Math.min(quantity, stock),
        },
      ];
    });
  };

  // =========================
  // ADD SELECTED PRODUCT TO CART
  // =========================
  const addSelectedProductToCart = () => {
    if (!selectedProduct) {
      return;
    }

    if (selectedProductSizes.length > 0 && !selectedSize) {
      setDetailError("Please select a size first.");
      return;
    }

    const availableStock = getSelectedStock();

    if (availableStock <= 0) {
      setDetailError(
        selectedSize
          ? `Size ${selectedSize} is out of stock.`
          : "This product is out of stock.",
      );
      return;
    }

    addToCart(
      selectedProduct,
      selectedSize || null,
      detailQuantity,
      availableStock,
    );

    closeProductDetails();
    setShowCart(true);
  };

  // =========================
  // INCREASE CART QUANTITY
  // =========================
  const increaseQuantity = (cartKey) => {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.cartKey !== cartKey) {
          return item;
        }

        return {
          ...item,
          quantity: Math.min(item.quantity + 1, item.stock),
        };
      }),
    );
  };

  // =========================
  // DECREASE CART QUANTITY
  // =========================
  const decreaseQuantity = (cartKey) => {
    setCart((currentCart) =>
      currentCart
        .map((item) => {
          if (item.cartKey !== cartKey) {
            return item;
          }

          return {
            ...item,
            quantity: item.quantity - 1,
          };
        })
        .filter((item) => item.quantity > 0),
    );
  };

  // =========================
  // REMOVE FROM CART
  // =========================
  const removeFromCart = (cartKey) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.cartKey !== cartKey),
    );
  };

  // =========================
  // OPEN CHECKOUT
  // =========================
  const openCheckout = async () => {
    setOrderError("");
    setOrderMessage("");

    if (customerSession) {
      try {
        await loadCustomerProfile(false);
      } catch (error) {
        console.error("Profile loading before checkout failed:", error);
      }
    }

    setShowCheckout(true);
  };

  // =========================
  // CLOSE CHECKOUT
  // =========================
  const closeCheckout = () => {
    if (!placingOrder) {
      setShowCheckout(false);
    }
  };

  // =========================
  // PAYMENT METHOD
  // =========================
  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);

    if (method === "cash_on_delivery") {
      setPaymentPhone("");
      setTransactionId("");
    }
  };

  // =========================
  // PLACE ORDER
  // =========================
  const placeOrder = async (event) => {
    event.preventDefault();

    setOrderError("");
    setOrderMessage("");

    if (cart.length === 0) {
      setOrderError("Your cart is empty.");
      return;
    }

    if (!customerName.trim()) {
      setOrderError("Customer name is required.");
      return;
    }

    if (!phone.trim()) {
      setOrderError("Phone number is required.");
      return;
    }

    if (!address.trim()) {
      setOrderError("Delivery address is required.");
      return;
    }

    if (!deliveryMethod) {
      setOrderError("Please select a delivery method.");
      return;
    }

    if (
      paymentMethod !== "cash_on_delivery" &&
      (!paymentPhone.trim() || !transactionId.trim())
    ) {
      setOrderError(
        "Payment phone number and transaction ID are required for online payment.",
      );

      return;
    }

    setPlacingOrder(true);

    try {
      const orderItems = cart.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
        size: item.size || null,
      }));

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers = {
        "Content-Type": "application/json",
      };

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          customer_name: customerName.trim(),
          phone: phone.trim(),
          email: session?.user?.email || profileData.email || null,
          district: profileData.district || null,
          address: address.trim(),
          delivery_method: deliveryMethod,
          payment_method: paymentMethod,

          payment_phone:
            paymentMethod === "cash_on_delivery" ? null : paymentPhone,

          transaction_id:
            paymentMethod === "cash_on_delivery" ? null : transactionId,

          items: orderItems,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to place order");
      }

      setOrderMessage(`Order placed successfully! Order ID: ${data.order.id}`);

      setCart([]);
      setCustomerName("");
      setPhone("");
      setAddress("");

      setPaymentMethod("cash_on_delivery");
      setPaymentPhone("");
      setTransactionId("");
      setDeliveryMethod("inside_dhaka");
    } catch (error) {
      setOrderError(error.message);
    } finally {
      setPlacingOrder(false);
    }
  };

  // =========================
  // CART TOTAL
  // =========================
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  const cartTotal = cart.reduce(
    (total, item) => total + Number(item.price) * item.quantity,
    0,
  );

  // =========================
  // ADMIN PAGE
  // =========================
  if (isAdminPage) {
    if (authLoading) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#111827",
          }}
        >
          Checking admin session...
        </div>
      );
    }

    if (!adminSession) {
      return (
        <AdminLogin
          onLogin={(session) => {
            setAdminSession(session);
          }}
        />
      );
    }

    return <Admin />;
  }

  // =========================
  // CUSTOMER STORE
  // =========================
  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div>
            <h1>Shadow Life Garments Item</h1>
            <p>Quality garments for everyday style</p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            {customerAuthLoading ? (
              <span
                style={{
                  color: "#ffffff",
                  fontSize: "14px",
                }}
              >
                Loading...
              </span>
            ) : customerSession ? (
              <>
                <button
                  type="button"
                  onClick={() => loadCustomerProfile(true)}
                  style={{
                    background: "#ffffff",
                    color: "#111827",
                    border: "1px solid #d1d5db",
                    borderRadius: "7px",
                    padding: "9px 12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  👤 Profile
                </button>

                <button
                  type="button"
                  onClick={loadMyOrders}
                  style={{
                    background: "#ffffff",
                    color: "#111827",
                    border: "1px solid #d1d5db",
                    borderRadius: "7px",
                    padding: "9px 12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  📦 My Orders
                </button>

                <button
                  type="button"
                  onClick={handleCustomerLogout}
                  style={{
                    background: "#ffffff",
                    color: "#111827",
                    border: "1px solid #d1d5db",
                    borderRadius: "7px",
                    padding: "9px 12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => openAuth("login")}
                style={{
                  background: "#ffffff",
                  color: "#111827",
                  border: "1px solid #d1d5db",
                  borderRadius: "7px",
                  padding: "9px 12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                👤 Login
              </button>
            )}

            <button
              className="cart-button"
              onClick={() => setShowCart(!showCart)}
            >
              🛒 Cart ({cartItemCount})
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        <h2>Our Products</h2>

        {loading && <p className="status-message">Loading products...</p>}

        {error && <p className="error">{error}</p>}

        {!loading && !error && products.length === 0 && (
          <p className="status-message">No products available.</p>
        )}

        {!loading && !error && (
          <div className="products">
            {products.map((product) => {
              const discount = getDiscountPercentage(
                product.original_price,
                product.price,
              );

              return (
                <div className="product-card" key={product.id}>
                  <div
                    className="product-image"
                    onClick={() => openProductDetails(product)}
                    style={{
                      cursor: "pointer",
                    }}
                  >
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} />
                    ) : (
                      <span>No Image</span>
                    )}
                  </div>

                  <div className="product-info">
                    <h3
                      onClick={() => openProductDetails(product)}
                      style={{
                        cursor: "pointer",
                      }}
                    >
                      {product.name}
                    </h3>

                    <p>{product.description}</p>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                        margin: "8px 0",
                      }}
                    >
                      {discount > 0 && (
                        <span
                          style={{
                            textDecoration: "line-through",
                            color: "#6b7280",
                            fontSize: "14px",
                          }}
                        >
                          {formatMoney(product.original_price)}
                        </span>
                      )}

                      <strong
                        style={{
                          fontSize: "20px",
                          color: "#111827",
                        }}
                      >
                        {formatMoney(product.price)}
                      </strong>

                      {discount > 0 && (
                        <span
                          style={{
                            background: "#dc2626",
                            color: "#ffffff",
                            padding: "3px 7px",
                            borderRadius: "5px",
                            fontSize: "11px",
                            fontWeight: 700,
                          }}
                        >
                          {discount}% OFF
                        </span>
                      )}
                    </div>

                    <p>
                      Stock:{" "}
                      {product.stock > 0 ? product.stock : "Out of stock"}
                    </p>

                    <button
                      onClick={() => openProductDetails(product)}
                      disabled={product.stock <= 0}
                    >
                      {product.stock > 0 ? "View Details" : "Out of Stock"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* =========================
            CUSTOMER LOGIN / SIGNUP
        ========================= */}
        {showAuth && (
          <div
            onClick={closeAuth}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              zIndex: 3000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              overflowY: "auto",
            }}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "min(450px, 100%)",
                background: "#ffffff",
                color: "#111827",
                borderRadius: "16px",
                padding: "25px",
                boxSizing: "border-box",
                position: "relative",
              }}
            >
              <button
                type="button"
                onClick={closeAuth}
                style={{
                  position: "absolute",
                  top: "12px",
                  right: "12px",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  border: "1px solid #d1d5db",
                  background: "#f3f4f6",
                  color: "#111827",
                  fontSize: "20px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>

              <h2
                style={{
                  color: "#111827",
                  marginTop: 0,
                  marginBottom: "20px",
                }}
              >
                {authMode === "login"
                  ? "Customer Login"
                  : "Create Customer Account"}
              </h2>

              {authMode === "signup" && (
                <label
                  style={{
                    display: "block",
                    marginBottom: "15px",
                    color: "#111827",
                    fontWeight: 600,
                  }}
                >
                  Full Name
                  <input
                    type="text"
                    value={authName}
                    onChange={(event) => setAuthName(event.target.value)}
                    placeholder="Enter your full name"
                    required
                    style={{
                      display: "block",
                      width: "100%",
                      boxSizing: "border-box",
                      marginTop: "6px",
                      padding: "11px",
                      border: "1px solid #d1d5db",
                      borderRadius: "7px",
                      color: "#111827",
                      caretColor: "#111827",
                      WebkitTextFillColor: "#111827",
                      background: "#ffffff",
                    }}
                  />
                </label>
              )}

              <form onSubmit={handleCustomerAuth}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "15px",
                    color: "#111827",
                    fontWeight: 600,
                  }}
                >
                  Email
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(event) => setAuthEmail(event.target.value)}
                    placeholder="Enter your email"
                    required
                    style={{
                      display: "block",
                      width: "100%",
                      boxSizing: "border-box",
                      marginTop: "6px",
                      padding: "11px",
                      border: "1px solid #d1d5db",
                      borderRadius: "7px",
                      color: "#111827",
                      caretColor: "#111827",
                      WebkitTextFillColor: "#111827",
                      background: "#ffffff",
                    }}
                  />
                </label>

                <label
                  style={{
                    display: "block",
                    marginBottom: "15px",
                    color: "#111827",
                    fontWeight: 600,
                  }}
                >
                  Password
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(event) => setAuthPassword(event.target.value)}
                    placeholder="Enter your password"
                    required
                    minLength={6}
                    style={{
                      display: "block",
                      width: "100%",
                      boxSizing: "border-box",
                      marginTop: "6px",
                      padding: "11px",
                      border: "1px solid #d1d5db",
                      borderRadius: "7px",
                      color: "#111827",
                      caretColor: "#111827",
                      WebkitTextFillColor: "#111827",
                      background: "#ffffff",
                    }}
                  />
                </label>

                {authError && (
                  <p
                    style={{
                      color: "#b91c1c",
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      padding: "10px",
                      borderRadius: "7px",
                    }}
                  >
                    {authError}
                  </p>
                )}

                {authMessage && (
                  <p
                    style={{
                      color: "#166534",
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      padding: "10px",
                      borderRadius: "7px",
                    }}
                  >
                    {authMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={authSubmitting}
                  style={{
                    width: "100%",
                    padding: "13px",
                    border: "none",
                    borderRadius: "8px",
                    background: authSubmitting ? "#9ca3af" : "#111827",
                    color: "#ffffff",
                    fontWeight: 700,
                    cursor: authSubmitting ? "not-allowed" : "pointer",
                  }}
                >
                  {authSubmitting
                    ? "Please wait..."
                    : authMode === "login"
                      ? "Login"
                      : "Create Account"}
                </button>
              </form>

              <div
                style={{
                  marginTop: "18px",
                  textAlign: "center",
                  color: "#4b5563",
                }}
              >
                {authMode === "login" ? (
                  <>
                    <span>Don't have an account? </span>

                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("signup");
                        setAuthError("");
                        setAuthMessage("");
                      }}
                      style={{
                        border: "none",
                        background: "none",
                        color: "#111827",
                        fontWeight: 700,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Create Account
                    </button>
                  </>
                ) : (
                  <>
                    <span>Already have an account? </span>

                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setAuthError("");
                        setAuthMessage("");
                      }}
                      style={{
                        border: "none",
                        background: "none",
                        color: "#111827",
                        fontWeight: 700,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Login
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================
            CUSTOMER PROFILE
        ========================= */}
        {showProfile && (
          <div
            onClick={() => {
              if (!profileSaving) {
                setShowProfile(false);
              }
            }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              zIndex: 2950,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              overflowY: "auto",
            }}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "min(520px, 100%)",
                maxHeight: "90vh",
                overflowY: "auto",
                background: "#ffffff",
                color: "#111827",
                borderRadius: "16px",
                padding: "24px",
                boxSizing: "border-box",
                position: "relative",
              }}
            >
              <button
                type="button"
                onClick={() => setShowProfile(false)}
                disabled={profileSaving}
                style={{
                  position: "absolute",
                  top: "14px",
                  right: "14px",
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  border: "1px solid #d1d5db",
                  background: "#f3f4f6",
                  color: "#111827",
                  fontSize: "21px",
                  fontWeight: 700,
                  cursor: profileSaving ? "not-allowed" : "pointer",
                }}
              >
                ✕
              </button>

              <h2
                style={{
                  color: "#111827",
                  marginTop: 0,
                  paddingRight: "45px",
                }}
              >
                My Profile
              </h2>

              {profileLoading ? (
                <p style={{ color: "#4b5563" }}>Loading your profile...</p>
              ) : (
                <form onSubmit={saveCustomerProfile}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "15px",
                      color: "#111827",
                      fontWeight: 600,
                    }}
                  >
                    Full Name
                    <input
                      type="text"
                      value={profileData.full_name}
                      onChange={(event) =>
                        setProfileData((current) => ({
                          ...current,
                          full_name: event.target.value,
                        }))
                      }
                      required
                      style={{
                        display: "block",
                        width: "100%",
                        boxSizing: "border-box",
                        marginTop: "6px",
                        padding: "11px",
                        border: "1px solid #d1d5db",
                        borderRadius: "7px",
                        color: "#111827",
                        caretColor: "#111827",
                        WebkitTextFillColor: "#111827",
                        background: "#ffffff",
                      }}
                    />
                  </label>

                  <label
                    style={{
                      display: "block",
                      marginBottom: "15px",
                      color: "#111827",
                      fontWeight: 600,
                    }}
                  >
                    Email
                    <input
                      type="email"
                      value={profileData.email}
                      readOnly
                      style={{
                        display: "block",
                        width: "100%",
                        boxSizing: "border-box",
                        marginTop: "6px",
                        padding: "11px",
                        border: "1px solid #d1d5db",
                        borderRadius: "7px",
                        color: "#6b7280",
                        background: "#f3f4f6",
                      }}
                    />
                  </label>

                  {/* =========================
                      EDITABLE PHONE
                  ========================= */}
                  <label
                    style={{
                      display: "block",
                      marginBottom: "15px",
                      color: "#111827",
                      fontWeight: 600,
                    }}
                  >
                    Phone
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(event) =>
                        setProfileData((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      placeholder="Enter your phone number"
                      required
                      style={{
                        display: "block",
                        width: "100%",
                        boxSizing: "border-box",
                        marginTop: "6px",
                        padding: "11px",
                        border: "1px solid #d1d5db",
                        borderRadius: "7px",
                        color: "#111827",
                        caretColor: "#111827",
                        WebkitTextFillColor: "#111827",
                        background: "#ffffff",
                      }}
                    />
                  </label>

                  <label
                    style={{
                      display: "block",
                      marginBottom: "15px",
                      color: "#111827",
                      fontWeight: 600,
                    }}
                  >
                    District
                    <input
                      type="text"
                      value={profileData.district}
                      onChange={(event) =>
                        setProfileData((current) => ({
                          ...current,
                          district: event.target.value,
                        }))
                      }
                      placeholder="Enter your district"
                      style={{
                        display: "block",
                        width: "100%",
                        boxSizing: "border-box",
                        marginTop: "6px",
                        padding: "11px",
                        border: "1px solid #d1d5db",
                        borderRadius: "7px",
                        color: "#111827",
                        caretColor: "#111827",
                        WebkitTextFillColor: "#111827",
                        background: "#ffffff",
                      }}
                    />
                  </label>

                  <label
                    style={{
                      display: "block",
                      marginBottom: "15px",
                      color: "#111827",
                      fontWeight: 600,
                    }}
                  >
                    Home Address
                    <textarea
                      value={profileData.home_address}
                      onChange={(event) =>
                        setProfileData((current) => ({
                          ...current,
                          home_address: event.target.value,
                        }))
                      }
                      placeholder="Enter your full home address"
                      rows="4"
                      style={{
                        display: "block",
                        width: "100%",
                        boxSizing: "border-box",
                        marginTop: "6px",
                        padding: "11px",
                        border: "1px solid #d1d5db",
                        borderRadius: "7px",
                        color: "#111827",
                        caretColor: "#111827",
                        WebkitTextFillColor: "#111827",
                        background: "#ffffff",
                        resize: "vertical",
                      }}
                    />
                  </label>

                  {profileError && (
                    <p
                      style={{
                        color: "#b91c1c",
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        padding: "10px",
                        borderRadius: "7px",
                      }}
                    >
                      {profileError}
                    </p>
                  )}

                  {profileMessage && (
                    <p
                      style={{
                        color: "#166534",
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        padding: "10px",
                        borderRadius: "7px",
                      }}
                    >
                      {profileMessage}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={profileSaving}
                    style={{
                      width: "100%",
                      padding: "13px",
                      border: "none",
                      borderRadius: "8px",
                      background: profileSaving ? "#9ca3af" : "#111827",
                      color: "#ffffff",
                      fontWeight: 700,
                      cursor: profileSaving ? "not-allowed" : "pointer",
                    }}
                  >
                    {profileSaving ? "Saving..." : "Save Profile"}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* =========================
            MY ORDERS
        ========================= */}
        {showOrders && (
          <div
            onClick={() => setShowOrders(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              zIndex: 2900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              overflowY: "auto",
            }}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "min(850px, 100%)",
                maxHeight: "90vh",
                overflowY: "auto",
                background: "#ffffff",
                color: "#111827",
                borderRadius: "16px",
                padding: "24px",
                boxSizing: "border-box",
                position: "relative",
              }}
            >
              <button
                type="button"
                onClick={() => setShowOrders(false)}
                style={{
                  position: "absolute",
                  top: "14px",
                  right: "14px",
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  border: "1px solid #d1d5db",
                  background: "#f3f4f6",
                  color: "#111827",
                  fontSize: "21px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>

              <h2
                style={{
                  color: "#111827",
                  marginTop: 0,
                  paddingRight: "45px",
                }}
              >
                My Orders
              </h2>

              {ordersLoading && (
                <p
                  style={{
                    color: "#4b5563",
                  }}
                >
                  Loading your orders...
                </p>
              )}

              {ordersError && (
                <p
                  style={{
                    color: "#b91c1c",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    padding: "10px",
                    borderRadius: "7px",
                  }}
                >
                  {ordersError}
                </p>
              )}

              {!ordersLoading && !ordersError && myOrders.length === 0 && (
                <p
                  style={{
                    color: "#4b5563",
                  }}
                >
                  You have not placed any orders yet.
                </p>
              )}

              {!ordersLoading && myOrders.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "15px",
                  }}
                >
                  {myOrders.map((order) => (
                    <div
                      key={order.id}
                      style={{
                        border: "1px solid #d1d5db",
                        borderRadius: "10px",
                        padding: "16px",
                        background: "#ffffff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "10px",
                          flexWrap: "wrap",
                          marginBottom: "10px",
                        }}
                      >
                        <strong
                          style={{
                            color: "#111827",
                          }}
                        >
                          Order ID: {order.id}
                        </strong>

                        <span
                          style={{
                            background: "#f3f4f6",
                            color: "#111827",
                            padding: "5px 9px",
                            borderRadius: "6px",
                            fontWeight: 700,
                            textTransform: "capitalize",
                          }}
                        >
                          {order.status}
                        </span>
                      </div>

                      <p
                        style={{
                          color: "#4b5563",
                          margin: "6px 0",
                        }}
                      >
                        Date:{" "}
                        {order.created_at
                          ? new Date(order.created_at).toLocaleString("en-BD")
                          : "N/A"}
                      </p>

                      <p
                        style={{
                          color: "#111827",
                          margin: "6px 0",
                          fontWeight: 700,
                        }}
                      >
                        Total: {formatMoney(order.total_amount)}
                      </p>

                      <p
                        style={{
                          color: "#4b5563",
                          margin: "6px 0",
                        }}
                      >
                        Payment:{" "}
                        {order.payment_method === "cash_on_delivery"
                          ? "Cash on Delivery"
                          : order.payment_method}
                      </p>

                      {Array.isArray(order.order_items) &&
                        order.order_items.length > 0 && (
                          <div
                            style={{
                              marginTop: "12px",
                              paddingTop: "12px",
                              borderTop: "1px solid #e5e7eb",
                            }}
                          >
                            <strong
                              style={{
                                color: "#111827",
                              }}
                            >
                              Items
                            </strong>

                            {order.order_items.map((item) => (
                              <div
                                key={item.id}
                                style={{
                                  marginTop: "8px",
                                  color: "#4b5563",
                                }}
                              >
                                <span>{item.product?.name || "Product"}</span>

                                {item.size && <span> — Size: {item.size}</span>}

                                <span> — Qty: {item.quantity}</span>

                                <span> — {formatMoney(item.price)} each</span>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================
            PRODUCT DETAILS MODAL
        ========================= */}
        {selectedProduct && (
          <div
            onClick={closeProductDetails}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              zIndex: 2000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              overflowY: "auto",
            }}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "min(900px, 100%)",
                maxHeight: "92vh",
                overflowY: "auto",
                background: "#ffffff",
                color: "#111827",
                borderRadius: "16px",
                padding: "24px",
                boxSizing: "border-box",
                position: "relative",
              }}
            >
              <button
                type="button"
                onClick={closeProductDetails}
                aria-label="Close product details"
                style={{
                  position: "absolute",
                  top: "15px",
                  right: "15px",
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  border: "1px solid #d1d5db",
                  background: "#f3f4f6",
                  color: "#111827",
                  fontSize: "22px",
                  fontWeight: 700,
                  lineHeight: 1,
                  cursor: "pointer",
                  zIndex: 5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "25px",
                }}
              >
                <div>
                  <div
                    style={{
                      width: "100%",
                      height: "400px",
                      background: "#f3f4f6",
                      borderRadius: "12px",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selectedImage ? (
                      <img
                        src={selectedImage}
                        alt={selectedProduct.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          color: "#6b7280",
                        }}
                      >
                        No Image
                      </span>
                    )}
                  </div>

                  {selectedProductImages.length > 1 && (
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        marginTop: "10px",
                        overflowX: "auto",
                      }}
                    >
                      {selectedProductImages.map((image, index) => (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          onClick={() => setSelectedImage(image)}
                          style={{
                            width: "70px",
                            height: "70px",
                            flexShrink: 0,
                            padding: "2px",
                            border:
                              selectedImage === image
                                ? "2px solid #111827"
                                : "1px solid #d1d5db",
                            borderRadius: "7px",
                            background: "#ffffff",
                            cursor: "pointer",
                            overflow: "hidden",
                          }}
                        >
                          <img
                            src={image}
                            alt={`${selectedProduct.name} ${index + 1}`}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    color: "#111827",
                  }}
                >
                  <h2
                    style={{
                      marginTop: 0,
                      marginBottom: "10px",
                      color: "#111827",
                    }}
                  >
                    {selectedProduct.name}
                  </h2>

                  <p
                    style={{
                      color: "#4b5563",
                      lineHeight: 1.6,
                    }}
                  >
                    {selectedProduct.description || "No description available."}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flexWrap: "wrap",
                      margin: "18px 0",
                    }}
                  >
                    {getDiscountPercentage(
                      selectedProduct.original_price,
                      selectedProduct.price,
                    ) > 0 && (
                      <span
                        style={{
                          color: "#6b7280",
                          textDecoration: "line-through",
                          fontSize: "16px",
                        }}
                      >
                        {formatMoney(selectedProduct.original_price)}
                      </span>
                    )}

                    <strong
                      style={{
                        fontSize: "28px",
                        color: "#111827",
                      }}
                    >
                      {formatMoney(selectedProduct.price)}
                    </strong>

                    {getDiscountPercentage(
                      selectedProduct.original_price,
                      selectedProduct.price,
                    ) > 0 && (
                      <span
                        style={{
                          background: "#dc2626",
                          color: "#ffffff",
                          padding: "5px 9px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 700,
                        }}
                      >
                        {getDiscountPercentage(
                          selectedProduct.original_price,
                          selectedProduct.price,
                        )}
                        % OFF
                      </span>
                    )}
                  </div>

                  {detailLoading ? (
                    <p
                      style={{
                        color: "#4b5563",
                      }}
                    >
                      Loading sizes...
                    </p>
                  ) : selectedProductSizes.length > 0 ? (
                    <div
                      style={{
                        marginTop: "20px",
                      }}
                    >
                      <h3
                        style={{
                          marginBottom: "10px",
                          color: "#111827",
                        }}
                      >
                        Select Size
                      </h3>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >
                        {selectedProductSizes.map((item) => {
                          const stock = Number(item.stock || 0);
                          const isSelected = selectedSize === item.size;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              disabled={stock <= 0}
                              onClick={() => handleSizeChange(item.size)}
                              style={{
                                minWidth: "58px",
                                padding: "10px 14px",
                                border: isSelected
                                  ? "2px solid #111827"
                                  : "1px solid #d1d5db",
                                borderRadius: "8px",
                                background: isSelected
                                  ? "#111827"
                                  : stock > 0
                                    ? "#ffffff"
                                    : "#f3f4f6",
                                color: isSelected
                                  ? "#ffffff"
                                  : stock > 0
                                    ? "#111827"
                                    : "#9ca3af",
                                cursor: stock > 0 ? "pointer" : "not-allowed",
                                fontWeight: 600,
                              }}
                            >
                              {item.size}
                            </button>
                          );
                        })}
                      </div>

                      {selectedSize && (
                        <p
                          style={{
                            marginTop: "10px",
                            color: "#4b5563",
                            fontSize: "14px",
                          }}
                        >
                          Available stock for size {selectedSize}:{" "}
                          <strong
                            style={{
                              color: "#111827",
                            }}
                          >
                            {getSelectedStock()}
                          </strong>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p
                      style={{
                        color: "#4b5563",
                        marginTop: "20px",
                      }}
                    >
                      This product does not have size options.
                    </p>
                  )}

                  <div
                    style={{
                      marginTop: "20px",
                    }}
                  >
                    <h3
                      style={{
                        marginBottom: "10px",
                        color: "#111827",
                      }}
                    >
                      Quantity
                    </h3>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setDetailQuantity(Math.max(1, detailQuantity - 1))
                        }
                        disabled={detailQuantity <= 1}
                        aria-label="Decrease quantity"
                        style={{
                          width: "40px",
                          height: "40px",
                          border: "1px solid #d1d5db",
                          borderRadius: "7px",
                          background: "#ffffff",
                          color: detailQuantity <= 1 ? "#9ca3af" : "#111827",
                          cursor:
                            detailQuantity > 1 ? "pointer" : "not-allowed",
                          fontSize: "22px",
                          fontWeight: 700,
                          lineHeight: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        −
                      </button>

                      <strong
                        style={{
                          minWidth: "30px",
                          textAlign: "center",
                          fontSize: "18px",
                          color: "#111827",
                        }}
                      >
                        {detailQuantity}
                      </strong>

                      <button
                        type="button"
                        onClick={() =>
                          setDetailQuantity(
                            Math.min(detailQuantity + 1, getSelectedStock()),
                          )
                        }
                        disabled={detailQuantity >= getSelectedStock()}
                        aria-label="Increase quantity"
                        style={{
                          width: "40px",
                          height: "40px",
                          border: "1px solid #d1d5db",
                          borderRadius: "7px",
                          background: "#ffffff",
                          color:
                            detailQuantity >= getSelectedStock()
                              ? "#9ca3af"
                              : "#111827",
                          cursor:
                            detailQuantity < getSelectedStock()
                              ? "pointer"
                              : "not-allowed",
                          fontSize: "22px",
                          fontWeight: 700,
                          lineHeight: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {detailError && (
                    <p
                      style={{
                        marginTop: "15px",
                        color: "#b91c1c",
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        padding: "10px",
                        borderRadius: "7px",
                      }}
                    >
                      {detailError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={addSelectedProductToCart}
                    disabled={
                      detailLoading ||
                      getSelectedStock() <= 0 ||
                      (selectedProductSizes.length > 0 && !selectedSize)
                    }
                    style={{
                      width: "100%",
                      marginTop: "22px",
                      padding: "14px",
                      border: "none",
                      borderRadius: "9px",
                      background:
                        detailLoading ||
                        getSelectedStock() <= 0 ||
                        (selectedProductSizes.length > 0 && !selectedSize)
                          ? "#9ca3af"
                          : "#111827",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: "15px",
                      cursor:
                        detailLoading ||
                        getSelectedStock() <= 0 ||
                        (selectedProductSizes.length > 0 && !selectedSize)
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {getSelectedStock() <= 0
                      ? "Out of Stock"
                      : selectedProductSizes.length > 0 && !selectedSize
                        ? "Select a Size"
                        : "Add to Cart"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================
            CART
        ========================= */}
        {showCart && (
          <section
            className="cart-section"
            style={{
              color: "#111827",
            }}
          >
            <div className="cart-header">
              <h2
                style={{
                  color: "#111827",
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                Your Cart
              </h2>

              <button
                className="close-cart"
                onClick={() => setShowCart(false)}
                style={{
                  color: "#111827",
                  background: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>

            {cart.length === 0 ? (
              <p
                className="empty-cart"
                style={{
                  color: "#111827",
                }}
              >
                Your cart is empty.
              </p>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div className="cart-item" key={item.cartKey}>
                      <div className="cart-item-image">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} />
                        ) : (
                          <span>No Image</span>
                        )}
                      </div>

                      <div
                        className="cart-item-info"
                        style={{
                          color: "#111827",
                        }}
                      >
                        <h3
                          style={{
                            color: "#111827",
                          }}
                        >
                          {item.name}
                        </h3>

                        {item.size && (
                          <p
                            style={{
                              color: "#111827",
                            }}
                          >
                            Size: <strong>{item.size}</strong>
                          </p>
                        )}

                        <p
                          style={{
                            color: "#111827",
                          }}
                        >
                          {formatMoney(item.price)} each
                        </p>

                        <div
                          className="quantity-controls"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => decreaseQuantity(item.cartKey)}
                            aria-label="Decrease cart quantity"
                            style={{
                              color: "#111827",
                              background: "#ffffff",
                              border: "1px solid #d1d5db",
                              fontWeight: 700,
                              fontSize: "20px",
                              lineHeight: 1,
                              width: "36px",
                              height: "36px",
                              borderRadius: "7px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            −
                          </button>

                          <span
                            style={{
                              color: "#111827",
                              fontWeight: 700,
                              minWidth: "25px",
                              textAlign: "center",
                            }}
                          >
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() => increaseQuantity(item.cartKey)}
                            disabled={item.quantity >= item.stock}
                            aria-label="Increase cart quantity"
                            style={{
                              color:
                                item.quantity >= item.stock
                                  ? "#9ca3af"
                                  : "#111827",
                              background: "#ffffff",
                              border: "1px solid #d1d5db",
                              fontWeight: 700,
                              fontSize: "20px",
                              lineHeight: 1,
                              width: "36px",
                              height: "36px",
                              borderRadius: "7px",
                              cursor:
                                item.quantity < item.stock
                                  ? "pointer"
                                  : "not-allowed",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            +
                          </button>
                        </div>

                        <p
                          className="item-subtotal"
                          style={{
                            color: "#111827",
                          }}
                        >
                          Subtotal:{" "}
                          {formatMoney(Number(item.price) * item.quantity)}
                        </p>

                        <p
                          style={{
                            fontSize: "12px",
                            color: "#4b5563",
                          }}
                        >
                          Available: {item.stock}
                        </p>
                      </div>

                      <button
                        className="remove-button"
                        onClick={() => removeFromCart(item.cartKey)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="cart-summary">
                  <h3
                    style={{
                      color: "#111827",
                    }}
                  >
                    Total: {formatMoney(cartTotal)}
                  </h3>

                  <button className="checkout-button" onClick={openCheckout}>
                    Proceed to Checkout
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {/* =========================
            CHECKOUT
        ========================= */}
        {showCheckout && (
          <section className="checkout-section">
            <div className="checkout-header">
              <h2>Checkout</h2>

              <button
                className="close-cart"
                onClick={closeCheckout}
                disabled={placingOrder}
              >
                ✕
              </button>
            </div>

            {orderMessage ? (
              <div className="order-success">
                <h3>Order Confirmed! 🎉</h3>

                <p>{orderMessage}</p>

                {customerSession && (
                  <p
                    style={{
                      color: "#166534",
                    }}
                  >
                    You can view this order anytime from{" "}
                    <strong>My Orders</strong>.
                  </p>
                )}

                <button
                  onClick={() => {
                    setOrderMessage("");
                    setShowCheckout(false);
                    setShowCart(false);
                  }}
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <form onSubmit={placeOrder} className="checkout-form">
                <label>
                  Customer Name
                  <input
                    type="text"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Enter your name"
                    required
                  />
                </label>

                <label>
                  Phone Number
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="Enter your phone number"
                    required
                  />
                </label>

                <label>
                  Delivery Address
                  <textarea
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="Enter your delivery address"
                    rows="4"
                    required
                  />
                </label>

                <div
                  style={{
                    marginTop: "10px",
                    marginBottom: "15px",
                    padding: "15px",
                    border: "1px solid #d1d5db",
                    borderRadius: "9px",
                    background: "#f9fafb",
                  }}
                >
                  <h3
                    style={{
                      color: "#111827",
                      marginTop: 0,
                    }}
                  >
                    Delivery Method
                  </h3>

                  <label
                    style={{
                      display: "block",
                      marginBottom: "10px",
                      color: "#111827",
                    }}
                  >
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="inside_dhaka"
                      checked={deliveryMethod === "inside_dhaka"}
                      onChange={() => setDeliveryMethod("inside_dhaka")}
                    />

                    <span style={{ marginLeft: "7px" }}>
                      Inside Dhaka — ৳80
                    </span>
                  </label>

                  <label
                    style={{
                      display: "block",
                      color: "#111827",
                    }}
                  >
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="outside_dhaka"
                      checked={deliveryMethod === "outside_dhaka"}
                      onChange={() => setDeliveryMethod("outside_dhaka")}
                    />

                    <span style={{ marginLeft: "7px" }}>
                      Outside Dhaka — ৳120
                    </span>
                  </label>
                </div>

                <div className="checkout-total">
                  <p
                    style={{
                      color: "#111827",
                      margin: "6px 0",
                    }}
                  >
                    Product Total: {formatMoney(cartTotal)}
                  </p>

                  <p
                    style={{
                      color: "#111827",
                      margin: "6px 0",
                    }}
                  >
                    Delivery Charge:{" "}
                    {formatMoney(deliveryMethod === "inside_dhaka" ? 80 : 120)}
                  </p>

                  <strong>
                    Total Amount:{" "}
                    {formatMoney(
                      cartTotal +
                        (deliveryMethod === "inside_dhaka" ? 80 : 120),
                    )}
                  </strong>
                </div>

                <div className="payment-section">
                  <h3>Payment Method</h3>

                  <label>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash_on_delivery"
                      checked={paymentMethod === "cash_on_delivery"}
                      onChange={() =>
                        handlePaymentMethodChange("cash_on_delivery")
                      }
                    />
                    Cash on Delivery
                  </label>

                  <label>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bkash"
                      checked={paymentMethod === "bkash"}
                      onChange={() => handlePaymentMethodChange("bkash")}
                    />
                    bKash
                  </label>

                  <label>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="nagad"
                      checked={paymentMethod === "nagad"}
                      onChange={() => handlePaymentMethodChange("nagad")}
                    />
                    Nagad
                  </label>

                  <label>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="rocket"
                      checked={paymentMethod === "rocket"}
                      onChange={() => handlePaymentMethodChange("rocket")}
                    />
                    Rocket
                  </label>
                </div>

                {paymentMethod !== "cash_on_delivery" && (
                  <div className="online-payment-info">
                    <p>
                      Please send{" "}
                      <strong>
                        {formatMoney(
                          cartTotal +
                            (deliveryMethod === "inside_dhaka" ? 80 : 120),
                        )}
                      </strong>{" "}
                      using your selected payment method.
                    </p>

                    <p>
                      After making the payment, enter the payment phone number
                      and transaction ID below.
                    </p>

                    <label>
                      Payment Phone Number
                      <input
                        type="tel"
                        value={paymentPhone}
                        onChange={(event) =>
                          setPaymentPhone(event.target.value)
                        }
                        placeholder="Enter payment phone number"
                        required
                      />
                    </label>

                    <label>
                      Transaction ID
                      <input
                        type="text"
                        value={transactionId}
                        onChange={(event) =>
                          setTransactionId(event.target.value)
                        }
                        placeholder="Enter transaction ID"
                        required
                      />
                    </label>
                  </div>
                )}

                {orderError && <p className="error">{orderError}</p>}

                <button
                  type="submit"
                  className="place-order-button"
                  disabled={placingOrder}
                >
                  {placingOrder ? "Placing Order..." : "Place Order"}
                </button>
              </form>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
