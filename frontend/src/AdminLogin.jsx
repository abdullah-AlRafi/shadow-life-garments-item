import { useState } from "react";
import { supabase } from "./supabaseClient";

function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.session) {
        throw new Error("Login session could not be created.");
      }

      onLogin(data.session);
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <style>{`
        .admin-login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f4f6f8;
          padding: 20px;
          font-family: Arial, Helvetica, sans-serif;
        }

        .admin-login-card {
          width: 100%;
          max-width: 420px;
          background: #ffffff;
          padding: 35px;
          border-radius: 16px;
          box-shadow: 0 5px 25px rgba(0, 0, 0, 0.08);
        }

        .admin-login-card h1 {
          margin: 0;
          color: #111827;
          font-size: 26px;
          text-align: center;
        }

        .admin-login-card .subtitle {
          margin: 8px 0 28px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 17px;
        }

        .login-form label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          color: #374151;
          font-size: 14px;
          font-weight: 600;
        }

        .login-form input {
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 9px;
          font-size: 14px;
          color: #111827;
          background: #ffffff;
          outline: none;
        }

        .login-form input:focus {
          border-color: #111827;
          box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
        }

        .login-button {
          width: 100%;
          padding: 12px;
          margin-top: 5px;
          border: none;
          border-radius: 9px;
          background: #111827;
          color: #ffffff;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
        }

        .login-button:hover {
          background: #000000;
        }

        .login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-error {
          padding: 11px;
          border-radius: 8px;
          background: #fee2e2;
          color: #b91c1c;
          font-size: 13px;
          line-height: 1.4;
        }

        .back-button {
          width: 100%;
          margin-top: 12px;
          padding: 11px;
          border: 1px solid #d1d5db;
          border-radius: 9px;
          background: #ffffff;
          color: #374151;
          font-size: 14px;
          cursor: pointer;
        }

        .back-button:hover {
          background: #f3f4f6;
        }
      `}</style>

      <div className="admin-login-card">
        <h1>Admin Login</h1>

        <p className="subtitle">Shadow Life Garments Item</p>

        <form className="login-form" onSubmit={handleLogin}>
          <label>
            Email Address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter admin email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter admin password"
              required
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <button
          type="button"
          className="back-button"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          Back to Store
        </button>
      </div>
    </div>
  );
}

export default AdminLogin;
