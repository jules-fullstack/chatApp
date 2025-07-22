import { Button, Modal, TextInput, Stack, Group, Text } from "@mantine/core";
import { EnvelopeIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

interface InviteUnregisteredUserModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: (emails: string[]) => void;
  isLoading: boolean;
  conversationId: string;
}

export default function InviteUnregisteredUserModal({
  opened,
  onClose,
  onConfirm,
  isLoading,
}: InviteUnregisteredUserModalProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [error, setError] = useState("");

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAddEmail = () => {
    if (!currentEmail.trim()) {
      setError("Please enter an email address");
      return;
    }

    if (!validateEmail(currentEmail.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    const emailToAdd = currentEmail.trim().toLowerCase();
    if (emails.includes(emailToAdd)) {
      setError("This email has already been added");
      return;
    }

    setEmails([...emails, emailToAdd]);
    setCurrentEmail("");
    setError("");
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setEmails(emails.filter(email => email !== emailToRemove));
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddEmail();
    }
  };

  const handleConfirm = () => {
    if (emails.length === 0) {
      setError("Please add at least one email address");
      return;
    }
    onConfirm(emails);
  };

  const handleClose = () => {
    setEmails([]);
    setCurrentEmail("");
    setError("");
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Invite Unregistered Users"
      centered
      size="md"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Invite new users to join this group chat via email. They'll receive an invitation link to sign up and will be automatically added to the group.
        </Text>

        <div>
          <Group gap="xs">
            <TextInput
              flex={1}
              placeholder="Enter email address"
              value={currentEmail}
              onChange={(event) => setCurrentEmail(event.currentTarget.value)}
              onKeyPress={handleKeyPress}
              error={error}
              leftSection={<EnvelopeIcon className="size-4" />}
            />
            <Button onClick={handleAddEmail} variant="light" size="sm">
              Add
            </Button>
          </Group>
        </div>

        {emails.length > 0 && (
          <div>
            <Text size="sm" fw={500} mb="xs">
              Email addresses to invite ({emails.length}):
            </Text>
            <Stack gap="xs">
              {emails.map((email) => (
                <Group key={email} justify="space-between" p="xs" bg="gray.1" style={{ borderRadius: "8px" }}>
                  <Text size="sm">{email}</Text>
                  <Button
                    variant="subtle"
                    size="xs"
                    p={4}
                    onClick={() => handleRemoveEmail(email)}
                    c="red"
                  >
                    <XMarkIcon className="size-4" />
                  </Button>
                </Group>
              ))}
            </Stack>
          </div>
        )}

        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            loading={isLoading}
            disabled={emails.length === 0}
          >
            Send Invitations
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}