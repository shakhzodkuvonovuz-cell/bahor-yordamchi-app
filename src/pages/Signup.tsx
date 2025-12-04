import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Redirect to unified auth page
export default function Signup() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/auth", { replace: true });
  }, [navigate]);

  return null;
}
