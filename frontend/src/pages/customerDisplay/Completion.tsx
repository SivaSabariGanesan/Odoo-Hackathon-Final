import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../routes/paths";

// Redirect to the unified customer display page
export default function CustomerCompletion() {
  const navigate = useNavigate();
  useEffect(() => { navigate(ROUTES.CUSTOMER_ORDER, { replace: true }); }, []);
  return null;
}
