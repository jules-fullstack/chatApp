import MessageTab from "./MessageTab";

export default function MessagesList() {
  return (
    <div className="space-y-2 px-2">
      {Array.from({ length: 15 }).map((_, index) => (
        <MessageTab key={index} />
      ))}
    </div>
  );
}
