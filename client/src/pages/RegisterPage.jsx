import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import Button from "../components/common/Button";
import { useAuth } from "../context/AuthContext";

const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();

  const redirectTo =
    location.state?.from?.pathname || "/teams";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create your account. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Get started"
      title="Create your DevFlow account"
      description="Create a workspace, invite your team, and move software work from idea to delivery."
      quote="A clear workflow gives every contributor a clear next step."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            state={{
              from: location.state?.from,
            }}
            className="font-semibold text-brand-600 hover:text-brand-800"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-5 text-red-700"
          >
            {error}
          </div>
        )}

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">
            Full name
          </span>

          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Your name"
            autoComplete="name"
            minLength="2"
            maxLength="80"
            required
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">
            Email address
          </span>

          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            autoComplete="email"
            required
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </label>

        <label className="block">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-700">
              Password
            </span>

            <span className="text-xs text-slate-400">
              At least 8 characters
            </span>
          </div>

          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a password"
            autoComplete="new-password"
            minLength="8"
            maxLength="100"
            required
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </label>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl py-3"
        >
          {isSubmitting
            ? "Creating account..."
            : "Create account"}
        </Button>

        <p className="text-center text-xs leading-5 text-slate-400">
          By creating an account, you agree to use DevFlow
          responsibly with your team.
        </p>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;