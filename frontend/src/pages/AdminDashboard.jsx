import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();
  
  // Redirect to reservations management by default
  useEffect(() => {
    navigate('/admin/reservas', { replace: true });
  }, [navigate]);

  // Return loading while redirecting
  return (
    <>
      <h1 className="app-logo">SIRESA</h1>
      <div className="login-container" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Redirecionando para gerenciamento de reservas...</p>
      </div>
    </>
  );
}