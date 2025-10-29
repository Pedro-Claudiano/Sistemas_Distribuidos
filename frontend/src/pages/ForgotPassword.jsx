import { useState } from "react";
// Adicionando .jsx para prevenir o erro de compilação anterior
import InputField from "../components/InputField.jsx";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setMessage({ type: "error", text: "Por favor, preencha o campo de email." });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Simulação de envio
      await new Promise(resolve => setTimeout(resolve, 1500));

      setMessage({
        type: "success",
        text: "Se este email estiver cadastrado, você receberá as instruções."
      });
      setSubmitted(true);
    } catch (err) {
      setMessage({ type: "error", text: "Ocorreu um erro. Tente novamente." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h1 className="app-logo">SIRESA</h1>

      <div className="login-container">
        <h2 className="form-title">Recuperar Senha</h2>
        <p className="separator"><span>Não se preocupe, acontece.</span></p>

        <form className="login-form" onSubmit={handleSubmit}>
          <InputField
            type="email"
            placeholder="Endereço de Email"
            icon="mail"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (message) setMessage(null); }}
          />

          {message && (
            <div className={`form-message ${message.type}`}>
              {message.text}
            </div>
          )}

          <button type="submit" className="login-button" disabled={isLoading || submitted}>
            {isLoading ? "Enviando..." : "Enviar Email"}
          </button>
        </form>

        <p className="signup-prompt">
          <a href="/login" style={{ pointerEvents: submitted ? "none" : "auto", opacity: submitted ? 0.7 : 1 }}>
            Voltar para o Login
          </a>
        </p>
      </div>
    </>
  );
}