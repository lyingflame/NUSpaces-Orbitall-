import { useState } from "react";
import "./App.css";
import { apiRequest } from "./services/api";
import ExplorePage from "./pages/ExplorePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("nuspacesUser");

      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error("Unable to restore saved user:", error);

      localStorage.removeItem("nuspacesUser");

      return null;
    }
  });

  const [showLogin, setShowLogin] = useState(false);

  function handleLogin(userData) {
    // Stores the full user object, including role.
    // Example:
    // {
    //   id: 1,
    //   username: "admin",
    //   email: "admin@u.nus.edu",
    //   role: "admin"
    // }

    localStorage.setItem(
      "nuspacesUser",
      JSON.stringify(userData)
    );

    setUser(userData);

    // Return to ExplorePage after successful login.
    setShowLogin(false);
  }

  async function handleLogout() {
    try {
      // Tells the backend to clear the authentication cookies.
      await apiRequest("/api/auth/logout", {
        method: "POST",
      });
    } catch (err) {
      console.error("Logout failed:", err.message);
    }

    // Remove locally stored user information.
    localStorage.removeItem("nuspacesUser");

    // Reset React user state.
    setUser(null);

    // Make sure we return to the Explore page.
    setShowLogin(false);
  }

  if (showLogin) {
    return (
      <LoginPage
        onLogin={handleLogin}
        onBack={() => setShowLogin(false)}
      />
    );
  }

  return (
    <ExplorePage
      user={user}
      onLoginClick={() => setShowLogin(true)}
      onLogout={handleLogout}
    />
  );
}