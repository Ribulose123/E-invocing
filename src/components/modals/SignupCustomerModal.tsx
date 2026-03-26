'use client'
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_END_POINT } from "@/app/config/Api";
import { useToast } from "@/components/ui/toaster";

type SignupCustomerForm = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  companyName: string;
  tin: string;
  password: string;
  confirmPassword: string;
};

interface SignupCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SignupCustomerModal: React.FC<SignupCustomerModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [signupError, setSignupError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<SignupCustomerForm>();

  const handleSignup = async (data: SignupCustomerForm) => {
    setLoading(true);
    setSignupError("");

    try {
      const fullName = `${data.firstName} ${data.lastName}`;
      const response = await fetch(API_END_POINT.AUTH.REGISTER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          name: fullName,
          password: data.password,
          tin: data.tin,
          company_name: data.companyName,
          phone_number: data.phoneNumber,
          is_aggregator: false,
          is_sandbox: true,
          platform_configs: {},
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Sign up failed");
      }

      addToast({
        variant: "success",
        title: "Sign Up Successful",
        description: "Customer account created successfully.",
      });
      onOpenChange(false);
      reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred";
      setSignupError(message);
      addToast({
        variant: "error",
        title: "Sign Up Failed",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          setSignupError("");
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Customer Account</DialogTitle>
          <DialogDescription>Fill the details below to sign up a customer.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleSignup)} className="space-y-4">
          {signupError && (
            <p className="text-sm text-red-600">{signupError}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                {...register("firstName", { required: "First name is required" })}
              />
              {errors.firstName && <p className="text-sm text-red-600">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                {...register("lastName", { required: "Last name is required" })}
              />
              {errors.lastName && <p className="text-sm text-red-600">{errors.lastName.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email", { required: "Email is required" })}
            />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              {...register("phoneNumber", { required: "Phone number is required" })}
            />
            {errors.phoneNumber && <p className="text-sm text-red-600">{errors.phoneNumber.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              {...register("companyName", { required: "Company name is required" })}
            />
            {errors.companyName && <p className="text-sm text-red-600">{errors.companyName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tin">TIN</Label>
            <Input
              id="tin"
              {...register("tin", { required: "TIN is required" })}
            />
            {errors.tin && <p className="text-sm text-red-600">{errors.tin.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "Password must be at least 8 characters" },
              })}
            />
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              {...register("confirmPassword", {
                required: "Confirm password is required",
                validate: (value) => value === watch("password") || "Passwords do not match",
              })}
            />
            {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setSignupError("");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

