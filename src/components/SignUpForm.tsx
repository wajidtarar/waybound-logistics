import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signUpSchema, type SignUpFormValues } from "@/lib/authSchemas"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"

import { useNavigate } from "react-router-dom"

export function SignUpForm() {

      const navigate = useNavigate()

  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({ resolver: zodResolver(signUpSchema) })

    async function onSubmit(values: SignUpFormValues) {
    setServerError(null)
    const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
    })
    if (error) {
        setServerError(error.message)
        return
    }
    if (data.session) {
        // Email confirmation is off — session exists immediately
        navigate("/")
    } else {
        // Email confirmation is on — no session yet
        setServerError("Check your inbox to confirm your email before logging in.")
    }
    }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register("password")} />
        {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
      </div>
      {serverError && <p className="text-sm text-red-500">{serverError}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating account..." : "Sign up"}
      </Button>
    </form>
  )
}