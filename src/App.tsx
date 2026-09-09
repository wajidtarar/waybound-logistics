import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "@/lib/useAuth"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { LoginForm } from "@/components/LoginForm"
import { SignUpForm } from "@/components/SignUpForm"
import { ShipmentList } from "@/components/ShipmentList"
import { ShipmentDetail } from "@/components/ShipmentDetail"

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/signup" element={<SignUpForm />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ShipmentList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shipments/:id"
            element={
              <ProtectedRoute>
                <ShipmentDetail />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}