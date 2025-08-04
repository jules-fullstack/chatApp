import { Group, Text, Pagination } from "@mantine/core";

interface PaginationData {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
}

interface AdminPaginationProps {
  pagination: PaginationData | undefined;
  currentPage: number;
  onPageChange: (page: number) => void;
  isSearchActive: boolean;
}

export function AdminPagination({
  pagination,
  currentPage,
  onPageChange,
  isSearchActive,
}: AdminPaginationProps) {
  // Don't show pagination during search
  if (isSearchActive) return null;
  
  if (!pagination || pagination.totalPages <= 1) return null;

  return (
    <Group justify="space-between" mt="md">
      <Text size="sm" c="dimmed">
        Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}{" "}
        to{" "}
        {Math.min(
          pagination.currentPage * pagination.itemsPerPage,
          pagination.totalItems
        )}{" "}
        of {pagination.totalItems} items
      </Text>
      <Pagination
        value={currentPage}
        onChange={onPageChange}
        total={pagination.totalPages}
        size="sm"
      />
    </Group>
  );
}