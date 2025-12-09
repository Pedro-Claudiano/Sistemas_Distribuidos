import { useState } from "react";
import { useNavigate } from "react-router-dom";
import InputField from "../components/InputField";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage({ type: "error", text: "Por favor, preencha todos os campos." });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Erro ao tentar fazer login");

      // Salva o token no localStorage
      localStorage.setItem('authToken', data.token);
      
      // Redireciona baseado no role do usuário
      if (data.role === 'admin') {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h1 className="app-logo">SIRESA</h1>

      <div className="login-container">
        <h2 className="form-title">Bem-vindo de volta!</h2>
        <p className="separator"><span>Faça login para continuar</span></p>
        <form className="login-form" onSubmit={handleSubmit}>
          <InputField
            type="email"
            placeholder="Endereço de Email"
            icon="mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <InputField
            type="password"
            placeholder="Senha"
            icon="lock"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {message && (
            <div className={`form-message ${message.type}`}>
              {message.text}
            </div>
          )}

          <a href="/forgot-password" className="forgot-password-link">Esqueceu a senha?</a>
          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? "Carregando..." : "Entrar"}
          </button>
        </form>
        <p className="signup-prompt">
          Não tem uma conta? <a href="/register">Registre-se</a>
        </p>
      </div>
    </>
  );
}

