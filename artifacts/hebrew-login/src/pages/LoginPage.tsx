import { useEffect } from "react";
import { useLocation } from "wouter";

export default function LoginPage() {
  const [, navigate] = useLocation();
  useEffect(() => { navigate("/team", { replace: true }); }, [navigate]);
  return null;
}
