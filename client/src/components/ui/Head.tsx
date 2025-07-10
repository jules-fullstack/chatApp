export default function Head({ children }: { children: string }) {
  return (
    <h2 className="text-gray-800 text-4xl/12 font-bold text-center mb-4">
      {children}
    </h2>
  );
}
