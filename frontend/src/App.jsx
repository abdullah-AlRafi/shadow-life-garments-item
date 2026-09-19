import { useEffect, useState } from "react";
import "./App.css";

import Admin from "./Admin";
import AdminLogin from "./AdminLogin";

import { supabase } from "./supabaseClient";

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCart, setShowCart] = useState(false);

  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

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
  // LOAD PRODUCTS
  // =========================
  useEffect(() => {
    if (isAdminPage) {
      return;
    }

    fetch("http://localhost:5000/api/products")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load products");
        }

        return response.json();
      })
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [isAdminPage]);

  // =========================
  // ADD TO CART
  // =========================
  const addToCart = (product) => {
    setCart((currentCart) => {
      const existingProduct = currentCart.find(
        (item) => item.id === product.id,
      );

      if (existingProduct) {
        return currentCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, product.stock),
              }
            : item,
        );
      }

      return [
        ...currentCart,
        {
          ...product,
          quantity: 1,
        },
      ];
    });
  };

  // =========================
  // INCREASE QUANTITY
  // =========================
  const increaseQuantity = (productId) => {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.id !== productId) {
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
  // DECREASE QUANTITY
  // =========================
  const decreaseQuantity = (productId) => {
    setCart((currentCart) =>
      currentCart
        .map((item) => {
          if (item.id !== productId) {
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
  const removeFromCart = (productId) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== productId),
    );
  };

  // =========================
  // OPEN CHECKOUT
  // =========================
  const openCheckout = () => {
    setOrderError("");
    setOrderMessage("");
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
      }));

      const response = await fetch("http://localhost:5000/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_name: customerName,
          phone,
          address,
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

          <button
            className="cart-button"
            onClick={() => setShowCart(!showCart)}
          >
            🛒 Cart ({cartItemCount})
          </button>
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
            {products.map((product) => (
              <div className="product-card" key={product.id}>
                <div className="product-image">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} />
                  ) : (
                    <span>No Image</span>
                  )}
                </div>

                <div className="product-info">
                  <h3>{product.name}</h3>

                  <p>{product.description}</p>

                  <strong>৳{product.price}</strong>

                  <p>
                    Stock: {product.stock > 0 ? product.stock : "Out of stock"}
                  </p>

                  <button
                    onClick={() => addToCart(product)}
                    disabled={product.stock <= 0}
                  >
                    {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* =========================
            CART
        ========================= */}
        {showCart && (
          <section className="cart-section">
            <div className="cart-header">
              <h2>Your Cart</h2>

              <button className="close-cart" onClick={() => setShowCart(false)}>
                ✕
              </button>
            </div>

            {cart.length === 0 ? (
              <p className="empty-cart">Your cart is empty.</p>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div className="cart-item" key={item.id}>
                      <div className="cart-item-image">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} />
                        ) : (
                          <span>No Image</span>
                        )}
                      </div>

                      <div className="cart-item-info">
                        <h3>{item.name}</h3>

                        <p>৳{item.price} each</p>

                        <div className="quantity-controls">
                          <button onClick={() => decreaseQuantity(item.id)}>
                            −
                          </button>

                          <span>{item.quantity}</span>

                          <button
                            onClick={() => increaseQuantity(item.id)}
                            disabled={item.quantity >= item.stock}
                          >
                            +
                          </button>
                        </div>

                        <p className="item-subtotal">
                          Subtotal: ৳{Number(item.price) * item.quantity}
                        </p>
                      </div>

                      <button
                        className="remove-button"
                        onClick={() => removeFromCart(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="cart-summary">
                  <h3>Total: ৳{cartTotal}</h3>

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

                <div className="checkout-total">
                  <strong>Total Amount: ৳{cartTotal}</strong>
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
                      Please send <strong>৳{cartTotal}</strong> using your
                      selected payment method.
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
