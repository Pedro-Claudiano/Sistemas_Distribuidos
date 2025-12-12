import { useState } from "react";
import { useNavigate } from "react-router-dom";
import InputField from "../components/InputField";

const API_BASE_URL = 'http://3.228.1.69:3000/api';

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (message) setMessage(null);
  };

  // Verifica se as senhas são diferentes *apenas* se o campo de confirmação não estiver vazio
  const passwordMismatch = formData.password !== formData.confirmPassword && formData.confirmPassword !== "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, password, confirmPassword } = formData;

    if (!name || !email || !password || !confirmPassword) {
      setMessage({ type: "error", text: "Por favor, preencha todos os campos." });
      return;
    }
    // A verificação de mismatch é refeita aqui para garantir
    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: "error", text: "As senhas não coincidem." });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao registrar");

      setMessage({ type: "success", text: "Registro realizado com sucesso! Redirecionando..." });
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
      setIsLoading(false);
    }
  };

  return (
    <>
      <h1 className="app-logo">SIRESA</h1>

      <div className="login-container">
        <h2 className="form-title">Crie sua conta</h2>
        <p className="separator"><span>É rápido e fácil</span></p>
        <form className="login-form" onSubmit={handleSubmit}>
          <InputField type="text" placeholder="Nome completo" icon="person" value={formData.name} onChange={handleChange("name")} />
          <InputField type="email" placeholder="Endereço de Email" icon="mail" value={formData.email} onChange={handleChange("email")} />
          <InputField type="password" placeholder="Senha" icon="lock" value={formData.password} onChange={handleChange("password")} />

          <InputField type="password" placeholder="Confirmar Senha" icon="lock" value={formData.confirmPassword} onChange={handleChange("confirmPassword")} />
          {message && (
            <div className={`form-message ${message.type}`}>
              {message.text}
            </div>
          )}


          <button type="submit" className="login-button" disabled={isLoading || passwordMismatch}>
            {isLoading ? "Carregando..." : "Criar Conta"}
          </button>
        </form>
        <p className="signup-prompt">
          Já tem uma conta? <a href="/login">Faça login</a>
        </p>
      </div>
    </>
  );
}
