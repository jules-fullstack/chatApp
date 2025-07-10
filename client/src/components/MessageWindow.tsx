import ConversationHeader from "./ConversationHeader";
import MessageSender from "./MessageSender";
import Container from "./ui/Container";
import Message from "./Message";

export default function MessageWindow() {
  return (
    <Container size="lg">
      <ConversationHeader />
      <Message />
      <MessageSender />
    </Container>
  );
}
