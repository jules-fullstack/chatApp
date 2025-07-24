import { Link } from "@tanstack/react-router";

interface AuthLinkProps {
  to: string;
  text: string;
  linkText: string;
}

export default function AuthLink({ to, text, linkText }: AuthLinkProps) {
  return (
    <h3 className="mt-8">
      {text}{" "}
      <Link
        to={to}
        className="text-blue-800 hover:text-blue-600 underline cursor-pointer"
      >
        {linkText}
      </Link>
    </h3>
  );
}
